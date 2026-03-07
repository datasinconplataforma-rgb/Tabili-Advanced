"use client";

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/hooks/useActivityLogs';

export function useSecureOperations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOperationPending, setIsOperationPending] = useState(false);

  const verifyOwnership = async (tableId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('custom_tables')
        .select('user_id')
        .eq('id', tableId)
        .single();
      
      if (error || !data) return false;
      return data.user_id === user.id;
    } catch {
      return false;
    }
  };

  const verifyEditPermission = async (tableId: string): Promise<boolean> => {
    if (!user) return false;
    
    // Verificar se é dono
    const isOwner = await verifyOwnership(tableId);
    if (isOwner) return true;
    
    // Verificar se tem permissão de edição
    try {
      const { data, error } = await supabase
        .from('table_shares')
        .select('permission')
        .eq('table_id', tableId)
        .eq('shared_with_email', user.email)
        .single();
      
      if (error || !data) return false;
      return data.permission === 'edit';
    } catch {
      return false;
    }
  };

  const secureRenameTable = async (tableId: string, newName: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsOperationPending(true);
    
    try {
      // 1. Verificar ownership
      if (!(await verifyOwnership(tableId))) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para renomear esta tabela', variant: 'destructive' });
        return false;
      }

      // 2. Executar operação
      const { error } = await supabase
        .from('custom_tables')
        .update({ name: newName })
        .eq('id', tableId);

      if (error) throw error;

      // 3. Registrar atividade
      await logActivity(
        user.id,
        user.email || '',
        tableId,
        newName,
        'Tabela renomeada',
        `Nome alterado`
      );

      toast({ title: 'Tabela renomeada com sucesso!' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao renomear tabela', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setIsOperationPending(false);
    }
  };

  const secureDeleteColumn = async (columnId: string, tableName: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsOperationPending(true);
    
    try {
      // 1. Verificar se usuário tem acesso à tabela da coluna
      const { data: columnData, error: columnError } = await supabase
        .from('custom_columns')
        .select('table_id')
        .eq('id', columnId)
        .single();

      if (columnError || !columnData) {
        toast({ title: 'Coluna não encontrada', variant: 'destructive' });
        return false;
      }

      const hasAccess = await verifyEditPermission(columnData.table_id);
      if (!hasAccess) {
        toast({ title: 'Acesso negado', description: 'Você não tem permissão para excluir esta coluna', variant: 'destructive' });
        return false;
      }

      // 2. Executar deleção
      const { error } = await supabase
        .from('custom_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      // 3. Registrar atividade
      await logActivity(
        user.id,
        user.email || '',
        columnData.table_id,
        tableName,
        'Coluna excluída',
        `Coluna removida`
      );

      toast({ title: 'Coluna excluída com sucesso!' });
      return true;
    } catch (error: any) {
      toast({ title: 'Erro ao excluir coluna', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setIsOperationPending(false);
    }
  };

  return {
    verifyOwnership,
    verifyEditPermission,
    secureRenameTable,
    secureDeleteColumn,
    isOperationPending
  };
}