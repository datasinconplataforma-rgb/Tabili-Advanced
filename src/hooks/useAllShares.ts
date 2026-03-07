import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface EnrichedShare {
  id: string;
  table_id: string;
  shared_with_email: string;
  permission: 'view' | 'edit';
  created_at: string;
  table_name: string;
  project_id: string | null;
  project_name: string | null;
}

export interface ProjectShareGroup {
  project_id: string;
  project_name: string;
  emails: Map<string, { tables: { shareId: string; tableName: string; tableId: string; permission: 'view' | 'edit' }[] }>;
}

export interface TableShareGroup {
  table_id: string;
  table_name: string;
  project_name: string | null;
  shares: { id: string; email: string; permission: 'view' | 'edit' }[];
}

export function useAllShares() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shares, setShares] = useState<EnrichedShare[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllShares = async () => {
    if (!user) {
      setShares([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch all shares owned by the user
      const { data: sharesData, error: sharesError } = await supabase
        .from('table_shares')
        .select('id, table_id, shared_with_email, permission, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (sharesError) throw sharesError;
      if (!sharesData || sharesData.length === 0) {
        setShares([]);
        setLoading(false);
        return;
      }

      // Get unique table IDs
      const tableIds = [...new Set(sharesData.map(s => s.table_id))];

      // Fetch table names and project_ids
      const { data: tablesData, error: tablesError } = await supabase
        .from('custom_tables')
        .select('id, name, project_id')
        .in('id', tableIds);

      if (tablesError) throw tablesError;

      const tablesMap = new Map((tablesData || []).map(t => [t.id, t]));

      // Get unique project IDs
      const projectIds = [...new Set(
        (tablesData || []).map(t => t.project_id).filter((id): id is string => !!id)
      )];

      // Fetch project names
      let projectsMap = new Map<string, string>();
      if (projectIds.length > 0) {
        const { data: projectsData, error: projectsError } = await supabase
          .from('table_projects')
          .select('id, name')
          .in('id', projectIds);

        if (projectsError) throw projectsError;
        projectsMap = new Map((projectsData || []).map(p => [p.id, p.name]));
      }

      // Enrich shares
      const enriched: EnrichedShare[] = sharesData.map(share => {
        const table = tablesMap.get(share.table_id);
        return {
          id: share.id,
          table_id: share.table_id,
          shared_with_email: share.shared_with_email,
          permission: share.permission as 'view' | 'edit',
          created_at: share.created_at,
          table_name: table?.name || 'Tabela removida',
          project_id: table?.project_id || null,
          project_name: table?.project_id ? (projectsMap.get(table.project_id) || null) : null,
        };
      });

      setShares(enriched);
    } catch (error: any) {
      toast({ title: 'Erro ao carregar compartilhamentos', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllShares();
  }, [user]);

  const updatePermission = async (shareId: string, permission: 'view' | 'edit') => {
    const { error } = await supabase
      .from('table_shares')
      .update({ permission })
      .eq('id', shareId);

    if (error) {
      toast({ title: 'Erro ao atualizar permissão', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchAllShares();
    toast({ title: 'Permissão atualizada!' });
    return true;
  };

  const removeShare = async (shareId: string) => {
    const { error } = await supabase
      .from('table_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      toast({ title: 'Erro ao remover compartilhamento', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchAllShares();
    toast({ title: 'Compartilhamento removido!' });
    return true;
  };

  // Stats
  const stats = useMemo(() => {
    const uniqueTables = new Set(shares.map(s => s.table_id));
    const uniqueEmails = new Set(shares.map(s => s.shared_with_email));
    return {
      totalTables: uniqueTables.size,
      totalUsers: uniqueEmails.size,
      totalShares: shares.length,
    };
  }, [shares]);

  // Group by project
  const byProject = useMemo((): ProjectShareGroup[] => {
    const projectMap = new Map<string, ProjectShareGroup>();

    for (const share of shares) {
      if (!share.project_id || !share.project_name) continue;

      if (!projectMap.has(share.project_id)) {
        projectMap.set(share.project_id, {
          project_id: share.project_id,
          project_name: share.project_name,
          emails: new Map(),
        });
      }

      const group = projectMap.get(share.project_id)!;
      if (!group.emails.has(share.shared_with_email)) {
        group.emails.set(share.shared_with_email, { tables: [] });
      }

      group.emails.get(share.shared_with_email)!.tables.push({
        shareId: share.id,
        tableName: share.table_name,
        tableId: share.table_id,
        permission: share.permission,
      });
    }

    return Array.from(projectMap.values()).sort((a, b) => a.project_name.localeCompare(b.project_name));
  }, [shares]);

  // Group by table
  const byTable = useMemo((): TableShareGroup[] => {
    const tableMap = new Map<string, TableShareGroup>();

    for (const share of shares) {
      if (!tableMap.has(share.table_id)) {
        tableMap.set(share.table_id, {
          table_id: share.table_id,
          table_name: share.table_name,
          project_name: share.project_name,
          shares: [],
        });
      }

      tableMap.get(share.table_id)!.shares.push({
        id: share.id,
        email: share.shared_with_email,
        permission: share.permission,
      });
    }

    return Array.from(tableMap.values()).sort((a, b) => a.table_name.localeCompare(b.table_name));
  }, [shares]);

  return {
    shares,
    loading,
    stats,
    byProject,
    byTable,
    updatePermission,
    removeShare,
    refetch: fetchAllShares,
  };
}
