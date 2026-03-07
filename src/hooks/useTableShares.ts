import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type SharePermission = 'view' | 'edit' | 'admin';

export interface TableShare {
  id: string;
  table_id: string;
  owner_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  permission: SharePermission;
  created_at: string;
}

export function useTableShares(tableId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shares, setShares] = useState<TableShare[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShares = async () => {
    if (!user || !tableId) {
      setShares([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('table_shares')
      .select('*')
      .eq('table_id', tableId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar compartilhamentos', description: error.message, variant: 'destructive' });
    } else {
      setShares((data || []).map(share => ({
        ...share,
        permission: share.permission as SharePermission
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tableId) {
      fetchShares();
    }
  }, [tableId, user]);

  const shareTable = async (email: string, permission: SharePermission) => {
    if (!user || !tableId) return false;

    // Check if already shared
    const existing = shares.find(s => s.shared_with_email.toLowerCase() === email.toLowerCase());
    if (existing) {
      toast({ title: 'Já compartilhado', description: 'Esta tabela já foi compartilhada com este email.', variant: 'destructive' });
      return false;
    }

    // Cannot share with yourself
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      toast({ title: 'Erro', description: 'Você não pode compartilhar uma tabela consigo mesmo.', variant: 'destructive' });
      return false;
    }

    const { error } = await supabase
      .from('table_shares')
      .insert({
        table_id: tableId,
        owner_id: user.id,
        shared_with_email: email.toLowerCase(),
        permission,
      });

    if (error) {
      toast({ title: 'Erro ao compartilhar', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchShares();
    toast({ title: 'Tabela compartilhada!', description: `Compartilhado com ${email}` });
    return true;
  };

  const updateSharePermission = async (shareId: string, permission: SharePermission) => {
    const { error } = await supabase
      .from('table_shares')
      .update({ permission })
      .eq('id', shareId);

    if (error) {
      toast({ title: 'Erro ao atualizar permissão', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchShares();
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

    await fetchShares();
    toast({ title: 'Compartilhamento removido!' });
    return true;
  };

  return {
    shares,
    loading,
    shareTable,
    updateSharePermission,
    removeShare,
    refetch: fetchShares,
  };
}
