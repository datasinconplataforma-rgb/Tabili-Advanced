import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Project {
  id: string;
  plataforma: string;
  conta: string;
  workspace: string;
  projeto: string;
  link: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, plataforma, conta, workspace, projeto, link')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os projetos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (count: number = 1) => {
    if (!user) return null;
    
    try {
      const rowsToInsert = Array(count).fill({ user_id: user.id });
      const { data, error } = await supabase
        .from('projects')
        .insert(rowsToInsert)
        .select('id, plataforma, conta, workspace, projeto, link');

      if (error) throw error;
      setProjects((prev) => [...prev, ...(data || [])]);
      return data;
    } catch (error) {
      console.error('Error adding project:', error);
      toast({
        title: 'Erro ao adicionar linha(s)',
        variant: 'destructive',
      });
      return null;
    }
  };

  const addProjectWithData = async (data: Omit<Project, 'id'>) => {
    if (!user) return null;
    
    try {
      const { data: newData, error } = await supabase
        .from('projects')
        .insert({ ...data, user_id: user.id })
        .select('id, plataforma, conta, workspace, projeto, link');

      if (error) throw error;
      setProjects((prev) => [...prev, ...(newData || [])]);
      return newData;
    } catch (error) {
      console.error('Error adding project with data:', error);
      toast({
        title: 'Erro ao adicionar projeto',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProject = async (id: string, field: keyof Project, value: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
      
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);

      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Erro ao excluir linha',
        variant: 'destructive',
      });
    }
  };

  const deleteMultipleProjects = async (ids: string[]) => {
    try {
      const { error } = await supabase.from('projects').delete().in('id', ids);

      if (error) throw error;
      setProjects((prev) => prev.filter((p) => !ids.includes(p.id)));
    } catch (error) {
      console.error('Error deleting projects:', error);
      toast({
        title: 'Erro ao excluir linhas',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  return {
    projects,
    loading,
    addProject,
    addProjectWithData,
    updateProject,
    deleteProject,
    deleteMultipleProjects,
    refetch: fetchProjects,
  };
}
