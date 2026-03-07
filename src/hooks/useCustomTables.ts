import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/hooks/useActivityLogs';

export type ColumnType = 'text' | 'number' | 'date' | 'time' | 'email' | 'url' | 'currency' | 'formula' | 'list' | 'reference';

export interface FormulaConfig {
  expression: string;
  references: {
    alias: string;
    tableId: string;
    columnName: string;
    tableName?: string;
    columnDisplayName?: string;
  }[];
}

export interface ListConfig {
  items: string[];
}

export interface ReferenceConfig {
  targetTableId: string;
  targetColumnName: string;
}

export interface CustomColumn {
  id: string;
  table_id: string;
  name: string;
  display_name: string;
  column_order: number;
  column_type: ColumnType;
  required: boolean;
  formula_config?: FormulaConfig;
  list_config?: ListConfig;
  reference_config?: ReferenceConfig;
}

export interface CustomTable {
  id: string;
  name: string;
  columns: CustomColumn[];
  user_id: string;
  is_owner: boolean;
  permission: 'owner' | 'admin' | 'view' | 'edit';
  shared_by_email?: string;
  share_count?: number;
  project_id?: string | null;
}

export interface CustomDataRow {
  id: string;
  table_id: string;
  data: Record<string, string>;
}

// Função auxiliar para verificar ownership
const verifyOwnership = async (tableId: string, userId: string): Promise<boolean> => {
  // Se for a tabela nova sendo criada, ignorar verificação no banco
  if (tableId === 'new_table') return true;
  
  try {
    const { data, error } = await supabase
      .from('custom_tables')
      .select('user_id')
      .eq('id', tableId)
      .single();
    
    if (error || !data) return false;
    return data.user_id === userId;
  } catch {
    return false;
  }
};

// Função auxiliar para verificar permissão de edição via RPC (usa RLS)
const verifyEditPermission = async (tableId: string): Promise<boolean> => {
  if (tableId === 'new_table') return true;
  const { data } = await supabase.rpc('user_can_edit_table', { check_table_id: tableId });
  return data === true;
};

export function useCustomTables() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tables, setTables] = useState<CustomTable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    if (!user) return;
    
    try {
      const { data: tablesData, error: tablesError } = await supabase
        .from('custom_tables')
        .select('*')
        .order('created_at', { ascending: true });

      if (tablesError) {
        toast({ title: 'Erro ao carregar tabelas', description: tablesError.message, variant: 'destructive' });
        return;
      }

      const { data: columnsData, error: columnsError } = await supabase
        .from('custom_columns')
        .select('*')
        .order('column_order', { ascending: true });

      if (columnsError) {
        toast({ title: 'Erro ao carregar colunas', description: columnsError.message, variant: 'destructive' });
        return;
      }

      // Fetch shares and accessible project IDs in parallel
      const [sharesResult, projectsResult] = await Promise.all([
        supabase
          .from('table_shares')
          .select('table_id, owner_id, shared_with_email, permission')
          .or(`owner_id.eq.${user.id},shared_with_email.eq.${user.email}`),
        supabase
          .from('table_projects')
          .select('id')
      ]);

      const sharesData = sharesResult.data as any[];
      const accessibleProjectIds = new Set((projectsResult.data || []).map(p => p.id));

      const sharesByTable = (sharesData || []).reduce((acc, share) => {
        if (!acc[share.table_id]) {
          acc[share.table_id] = { count: 0, sharedBy: null, sharedByEmail: null, permission: null };
        }
        if (share.owner_id === user.id) {
          acc[share.table_id].count++;
        } else if (share.shared_with_email === user.email) {
          acc[share.table_id].sharedBy = share.owner_id;
          acc[share.table_id].sharedByEmail = null; 
          acc[share.table_id].permission = share.permission;
        }
        return acc;
      }, {} as Record<string, { count: number; sharedBy: string | null; sharedByEmail: string | null; permission: string | null }>);

      const tablesWithColumns: CustomTable[] = (tablesData || []).map((table) => {
        const isOwner = table.user_id === user.id;
        const shareInfo = sharesByTable[table.id];
        
        const effectiveProjectId = isOwner
          ? table.project_id
          : (table.project_id && accessibleProjectIds.has(table.project_id) ? table.project_id : null);
        
        return {
          id: table.id,
          name: table.name,
          user_id: table.user_id,
          project_id: effectiveProjectId,
          is_owner: isOwner,
          permission: isOwner ? 'owner' : (shareInfo?.permission as 'admin' | 'view' | 'edit') || 'view',
          share_count: isOwner ? (shareInfo?.count || 0) : undefined,
          shared_by_email: !isOwner ? (shareInfo?.sharedByEmail || undefined) : undefined,
          columns: (columnsData || [])
            .filter((col) => col.table_id === table.id)
            .map((col) => {
              const rawConfig = col.formula_config as any;
              return {
                ...col,
                column_type: (col.column_type || 'text') as ColumnType,
                required: rawConfig?.required === true,
                formula_config: rawConfig?.expression ? (rawConfig as FormulaConfig) : undefined,
                list_config: rawConfig?.items ? { items: rawConfig.items } : undefined,
                reference_config: rawConfig?.targetTableId ? {
                  targetTableId: rawConfig.targetTableId,
                  targetColumnName: rawConfig.targetColumnName
                } : undefined,
              };
            }),
        };
      });

      setTables(tablesWithColumns);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar tabelas', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTables();
    }
  }, [user]);

  const validateFormulaReferences = async (formulaConfig: FormulaConfig, userId: string): Promise<boolean> => {
    if (!formulaConfig.references || formulaConfig.references.length === 0) return true;
    
    for (const ref of formulaConfig.references) {
      // Pular validação para a própria tabela nova
      if (ref.tableId === 'new_table') continue;
      
      const isOwner = await verifyOwnership(ref.tableId, userId);
      if (!isOwner) {
        return false;
      }
    }
    return true;
  };

  const createTable = async (name: string, columns: { name: string; display_name: string; column_type?: ColumnType; required?: boolean; list_config?: ListConfig; formula_config?: FormulaConfig; reference_config?: ReferenceConfig }[]) => {
    if (!user) return null;

    try {
      // 1. Validar fórmulas antes de começar
      for (const col of columns) {
        if (col.column_type === 'formula' && col.formula_config) {
          const isValid = await validateFormulaReferences(col.formula_config, user.id);
          if (!isValid) {
            toast({ title: 'Erro ao criar coluna', description: 'Fórmula referencia tabela de outro usuário', variant: 'destructive' });
            return null;
          }
        }
      }

      // 2. Criar a tabela
      const { data: tableData, error: tableError } = await supabase
        .from('custom_tables')
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (tableError) {
        toast({ title: 'Erro ao criar tabela', description: tableError.message, variant: 'destructive' });
        return null;
      }

      // 3. Preparar e inserir colunas, corrigindo IDs de referência nas fórmulas
      const columnsToInsert = columns.map((col, index) => {
        const colData: Record<string, unknown> = {
          table_id: tableData.id,
          name: col.name,
          display_name: col.display_name,
          column_order: index,
          column_type: col.column_type || 'text',
          formula_config: { required: !!col.required }
        };

        const config = colData.formula_config as Record<string, any>;

        if (col.column_type === 'list' && col.list_config?.items?.length) {
          Object.assign(config, { items: col.list_config.items });
        } else if (col.column_type === 'formula' && col.formula_config) {
          // Importante: substituir o ID temporário 'new_table' pelo ID real da tabela criada
          const correctedConfig = { ...col.formula_config };
          if (correctedConfig.references) {
            correctedConfig.references = correctedConfig.references.map(ref => ({
              ...ref,
              tableId: ref.tableId === 'new_table' ? tableData.id : ref.tableId
            }));
          }
          Object.assign(config, correctedConfig);
        } else if (col.column_type === 'reference' && col.reference_config) {
          Object.assign(config, col.reference_config);
        }

        return colData;
      });

      const { error: columnsError } = await supabase
        .from('custom_columns')
        .insert(columnsToInsert as never);

      if (columnsError) {
        toast({ title: 'Erro ao criar colunas', description: columnsError.message, variant: 'destructive' });
        return null;
      }

      await logActivity(user.id, user.email || '', tableData.id, name, 'Tabela criada', `${columns.length} colunas`);
      await fetchTables();
      toast({ title: 'Tabela criada com sucesso!' });
      return tableData.id;
    } catch (error: any) {
      toast({ title: 'Erro ao criar tabela', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!user) return;
    
    try {
      const isOwner = await verifyOwnership(tableId, user.id);
      if (!isOwner) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para excluir esta tabela', variant: 'destructive' });
        return;
      }

      const table = tables.find(t => t.id === tableId);
      const tableName = table?.name || 'Desconhecida';

      const { error } = await supabase.from('custom_tables').delete().eq('id', tableId);

      if (error) {
        toast({ title: 'Erro ao excluir tabela', description: error.message, variant: 'destructive' });
        return;
      }

      await logActivity(user.id, user.email || '', null, tableName, 'Tabela excluída');
      await fetchTables();
      toast({ title: 'Tabela excluída' });
    } catch (error: any) {
      toast({ title: 'Erro ao excluir tabela', description: error.message, variant: 'destructive' });
    }
  };

  const renameTable = async (tableId: string, newName: string) => {
    if (!user) return false;
    
    try {
      const isOwner = await verifyOwnership(tableId, user.id);
      if (!isOwner) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para renomear esta tabela', variant: 'destructive' });
        return false;
      }

      const table = tables.find(t => t.id === tableId);
      const oldName = table?.name || '';

      const { error } = await supabase.from('custom_tables').update({ name: newName }).eq('id', tableId);

      if (error) {
        toast({ title: 'Erro ao renomear tabela', description: error.message, variant: 'destructive' });
        return false;
      }

      await logActivity(user.id, user.email || '', tableId, newName, 'Tabela renomeada', `De "${oldName}" para "${newName}"`);
      await fetchTables();
      toast({ title: 'Tabela renomeada com sucesso!' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao renomear tabela', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const addColumn = async (tableId: string, column: { name: string; display_name: string; column_type: ColumnType; required?: boolean; formula_config?: FormulaConfig; list_config?: ListConfig; reference_config?: ReferenceConfig }) => {
    if (!user) return false;
    
    try {
      const hasPermission = await verifyEditPermission(tableId);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para adicionar colunas nesta tabela', variant: 'destructive' });
        return false;
      }

      if (column.column_type === 'formula' && column.formula_config) {
        const isValid = await validateFormulaReferences(column.formula_config, user.id);
        if (!isValid) {
          toast({ title: 'Erro ao adicionar coluna', description: 'Fórmula referencia tabela de outro usuário', variant: 'destructive' });
          return false;
        }
      }

      const table = tables.find(t => t.id === tableId);
      const maxOrder = table?.columns.reduce((max, col) => Math.max(max, col.column_order), -1) ?? -1;

      const config: Record<string, any> = { required: !!column.required };
      
      if (column.formula_config) {
        Object.assign(config, column.formula_config);
      } else if (column.list_config) {
        Object.assign(config, { items: column.list_config.items });
      } else if (column.reference_config) {
        Object.assign(config, column.reference_config);
      }

      const insertData = {
        table_id: tableId,
        name: column.name,
        display_name: column.display_name,
        column_type: column.column_type,
        column_order: maxOrder + 1,
        formula_config: config,
      };

      const { error } = await supabase.from('custom_columns').insert(insertData as never);

      if (error) {
        toast({ title: 'Erro ao adicionar coluna', description: error.message, variant: 'destructive' });
        return false;
      }

      await fetchTables();
      toast({ title: 'Coluna adicionada com sucesso!' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar coluna', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const updateColumn = async (columnId: string, updates: { display_name?: string; column_type?: ColumnType; required?: boolean; formula_config?: FormulaConfig; list_config?: ListConfig; reference_config?: ReferenceConfig }) => {
    if (!user) return false;
    
    try {
      const { data: columnData } = await supabase
        .from('custom_columns')
        .select('table_id')
        .eq('id', columnId)
        .single();
      
      if (!columnData) {
        toast({ title: 'Coluna não encontrada', variant: 'destructive' });
        return false;
      }

      const hasPermission = await verifyEditPermission(columnData.table_id);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para editar esta coluna', variant: 'destructive' });
        return false;
      }

      if (updates.column_type === 'formula' && updates.formula_config) {
        const isValid = await validateFormulaReferences(updates.formula_config, user.id);
        if (!isValid) {
          toast({ title: 'Erro ao atualizar coluna', description: 'Fórmula referencia tabela de outro usuário', variant: 'destructive' });
          return false;
        }
      }

      const updateData: Record<string, unknown> = {};
      if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
      if (updates.column_type !== undefined) updateData.column_type = updates.column_type;
      
      const config: Record<string, any> = {};
      if (updates.required !== undefined) config.required = updates.required;

      if (updates.column_type === 'formula' && updates.formula_config) {
        Object.assign(config, updates.formula_config);
      } else if (updates.column_type === 'list' && updates.list_config) {
        Object.assign(config, { items: updates.list_config.items });
      } else if (updates.column_type === 'reference' && updates.reference_config) {
        Object.assign(config, updates.reference_config);
      }

      updateData.formula_config = config;

      const { error } = await supabase.from('custom_columns').update(updateData).eq('id', columnId);

      if (error) {
        toast({ title: 'Erro ao atualizar coluna', description: error.message, variant: 'destructive' });
        return false;
      }

      await fetchTables();
      toast({ title: 'Coluna atualizada com sucesso!' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar coluna', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteColumn = async (columnId: string) => {
    if (!user) return false;
    
    try {
      const { data: columnData } = await supabase
        .from('custom_columns')
        .select('table_id')
        .eq('id', columnId)
        .single();
      
      if (!columnData) {
        toast({ title: 'Coluna não encontrada', variant: 'destructive' });
        return false;
      }

      const hasPermission = await verifyEditPermission(columnData.table_id);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para excluir esta coluna', variant: 'destructive' });
        return false;
      }

      const { error } = await supabase.from('custom_columns').delete().eq('id', columnId);

      if (error) {
        toast({ title: 'Erro ao excluir coluna', description: error.message, variant: 'destructive' });
        return false;
      }

      await fetchTables();
      toast({ title: 'Coluna excluída com sucesso!' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao excluir coluna', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const getColumnDataCount = async (tableId: string, columnName: string): Promise<number> => {
    const { data, error } = await supabase.from('custom_data').select('data').eq('table_id', tableId);
    if (error || !data) return 0;
    return data.filter(row => {
      const rowData = row.data as Record<string, string>;
      return rowData && rowData[columnName] && String(rowData[columnName]).trim() !== '';
    }).length;
  };

  return { 
    tables, loading, createTable, deleteTable, renameTable, addColumn, updateColumn, deleteColumn, getColumnDataCount, refetch: fetchTables 
  };
}

export function useCustomTableData(tableId: string | null, tableName?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<CustomDataRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user || !tableId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const { data: tableAccess } = await supabase.rpc('user_has_table_access', { check_table_id: tableId });
      if (!tableAccess) {
        setData([]);
        setLoading(false);
        return;
      }

      const { data: rowsData, error } = await supabase
        .from('custom_data')
        .select('*')
        .eq('table_id', tableId)
        .order('created_at', { ascending: true });

      if (error) {
        toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
        return;
      }

      setData((rowsData || []).map((row) => ({
        id: row.id,
        table_id: row.table_id,
        data: (row.data as Record<string, string>) || {},
      })));
    } catch (error: any) {
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [tableId, user]);

  const addRow = async (count: number = 1) => {
    if (!user || !tableId) return;
    
    try {
      const hasPermission = await verifyEditPermission(tableId);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para adicionar dados nesta tabela', variant: 'destructive' });
        return;
      }

      const rows = Array.from({ length: count }, () => ({ table_id: tableId, user_id: user.id, data: {} }));
      const { error } = await supabase.from('custom_data').insert(rows);
      if (error) {
        toast({ title: 'Erro ao adicionar linha', description: error.message, variant: 'destructive' });
        return;
      }
      await fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar linha', description: error.message, variant: 'destructive' });
    }
  };

  const addRowWithData = async (rowData: Record<string, string>) => {
    if (!user || !tableId) return;
    
    try {
      const hasPermission = await verifyEditPermission(tableId);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para adicionar dados nesta tabela', variant: 'destructive' });
        throw new Error('Unauthorized');
      }

      const { error } = await supabase.from('custom_data').insert({ table_id: tableId, user_id: user.id, data: rowData });
      if (error) {
        toast({ title: 'Erro ao adicionar dados', description: error.message, variant: 'destructive' });
        throw error;
      }
      if (tableName) await logActivity(user.id, user.email || '', tableId, tableName, 'Entrada de dados', '1 linha adicionada');
      await fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar dados', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const addMultipleRowsWithData = async (rowsData: Record<string, string>[], onProgress?: (current: number, total: number) => void): Promise<{ success: boolean; imported: number }> => {
    if (!user || !tableId) return { success: false, imported: 0 };
    
    try {
      const hasPermission = await verifyEditPermission(tableId);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para adicionar dados nesta tabela', variant: 'destructive' });
        return { success: false, imported: 0 };
      }

      const BATCH_SIZE = 500;
      const batches: Record<string, string>[][] = [];
      for (let i = 0; i < rowsData.length; i += BATCH_SIZE) batches.push(rowsData.slice(i, i + BATCH_SIZE));
      
      let imported = 0;
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const insertData = batch.map((data) => ({ table_id: tableId, user_id: user.id, data }));
        const { error } = await supabase.from('custom_data').insert(insertData);
        if (error) continue;
        imported += batch.length;
        onProgress?.(imported, rowsData.length);
        if (i < batches.length - 1) await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (tableName && imported > 0) await logActivity(user.id, user.email || '', tableId, tableName, 'Entrada de dados', `${imported} linhas adicionadas`);
      await fetchData();
      return { success: imported > 0, imported };
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar dados', description: error.message, variant: 'destructive' });
      return { success: false, imported: 0 };
    }
  };

  const updateRow = async (rowId: string, field: string, value: string) => {
    if (!user || !tableId) return;
    
    try {
      const hasPermission = await verifyEditPermission(tableId);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para editar esta linha', variant: 'destructive' });
        return;
      }

      const row = data.find((r) => r.id === rowId);
      if (!row) return;
      const newData = { ...row.data, [field]: value };
      const { error } = await supabase.from('custom_data').update({ data: newData }).eq('id', rowId);
      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }
      setData((prev) => prev.map((r) => (r.id === rowId ? { ...r, data: newData } : r)));
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!user || !tableId) return;
    
    try {
      const hasPermission = await verifyEditPermission(tableId);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para excluir esta linha', variant: 'destructive' });
        return;
      }

      const { error } = await supabase.from('custom_data').delete().eq('id', rowId);
      if (error) {
        toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
        return;
      }
      
      setData(prev => prev.filter(r => r.id !== rowId));
      
      if (tableName) await logActivity(user.id, user.email || '', tableId, tableName, 'Linha excluída', '1 linha removida');
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const deleteMultipleRows = async (rowIds: string[]) => {
    if (!user || !tableId || rowIds.length === 0) return;
    
    try {
      const hasPermission = await verifyEditPermission(tableId);
      if (!hasPermission) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para excluir estas linhas', variant: 'destructive' });
        return;
      }

      const BATCH_SIZE = 500;
      let totalDeleted = 0;
      const failedIds: string[] = [];
      
      for (let i = 0; i < rowIds.length; i += BATCH_SIZE) {
        const batch = rowIds.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('custom_data').delete().in('id', batch);
        
        if (error) {
          failedIds.push(...batch);
          console.error('Erro parcial ao excluir lote:', error.message);
          continue;
        }
        totalDeleted += batch.length;
      }

      if (totalDeleted > 0) {
        const deletedSet = new Set(rowIds.filter(id => !failedIds.includes(id)));
        setData(prev => prev.filter(r => !deletedSet.has(r.id)));
        
        if (tableName) {
          await logActivity(user.id, user.email || '', tableId, tableName, 'Linhas excluídas', `${totalDeleted} linhas removidas`);
        }
        
        if (failedIds.length === 0) {
          toast({ title: 'Exclusão concluída', description: `${totalDeleted} registros removidos com sucesso.` });
        } else {
          toast({ 
            title: 'Exclusão parcial', 
            description: `Removidos ${totalDeleted} registros. ${failedIds.length} registros falharam.`,
            variant: 'destructive' 
          });
        }
      } else {
        toast({ title: 'Erro ao excluir', description: 'Nenhum registro pôde ser removido.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  return { data, loading, addRow, addRowWithData, addMultipleRowsWithData, updateRow, deleteRow, deleteMultipleRows, refetch: fetchData };
}