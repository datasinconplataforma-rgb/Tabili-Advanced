import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TableProject {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
  is_owner: boolean;
}

export const ULTIMAS_CRIADAS_NAME = 'Últimas Criadas';

export function useTableProjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<TableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimasCriadasId, setUltimasCriadasId] = useState<string | null>(null);

  const ensureUltimasCriadas = async (): Promise<string | null> => {
    if (!user) return null;

    // Check if it already exists (get all to clean duplicates)
    const { data: existing } = await supabase
      .from('table_projects')
      .select('id, created_at')
      .eq('name', ULTIMAS_CRIADAS_NAME)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (existing && existing.length > 0) {
      const keepId = existing[0].id;

      // Remove duplicates if any
      if (existing.length > 1) {
        const dupeIds = existing.slice(1).map(e => e.id);
        // Move tables from dupes to the first one
        for (const dupeId of dupeIds) {
          await supabase
            .from('custom_tables')
            .update({ project_id: keepId } as never)
            .eq('project_id', dupeId);
          await supabase
            .from('table_projects')
            .delete()
            .eq('id', dupeId);
        }
      }

      setUltimasCriadasId(keepId);
      return keepId;
    }

    // Create it
    const { data, error } = await supabase
      .from('table_projects')
      .insert({ name: ULTIMAS_CRIADAS_NAME, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating Últimas Criadas project:', error);
      return null;
    }

    setUltimasCriadasId(data.id);
    return data.id;
  };

  const fetchProjects = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('table_projects')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao carregar projetos', description: error.message, variant: 'destructive' });
      return;
    }

    const mapped = (data || []).map(p => ({
      ...p,
      is_owner: p.user_id === user.id,
    }));

    // Find Últimas Criadas id
    const uc = mapped.find(p => p.name === ULTIMAS_CRIADAS_NAME && p.is_owner);
    if (uc) setUltimasCriadasId(uc.id);

    setProjects(mapped);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      ensureUltimasCriadas().then(() => fetchProjects());
    }
  }, [user]);

  const createProject = async (name: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('table_projects')
      .insert({ name, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar projeto', description: error.message, variant: 'destructive' });
      return null;
    }

    await fetchProjects();
    toast({ title: 'Projeto criado com sucesso!' });
    return data.id;
  };

  const renameProject = async (projectId: string, newName: string) => {
    const { error } = await supabase
      .from('table_projects')
      .update({ name: newName })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Erro ao renomear projeto', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchProjects();
    toast({ title: 'Projeto renomeado com sucesso!' });
    return true;
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase
      .from('table_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Erro ao excluir projeto', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchProjects();
    toast({ title: 'Projeto excluído com sucesso!' });
    return true;
  };

  const assignTableToProject = async (tableId: string, projectId: string | null) => {
    const { error } = await supabase
      .from('custom_tables')
      .update({ project_id: projectId } as never)
      .eq('id', tableId);

    if (error) {
      toast({ title: 'Erro ao mover tabela', description: error.message, variant: 'destructive' });
      return false;
    }

    return true;
  };

  return {
    projects,
    loading,
    ultimasCriadasId,
    createProject,
    renameProject,
    deleteProject,
    assignTableToProject,
    refetch: fetchProjects,
  };
}
