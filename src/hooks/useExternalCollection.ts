import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExternalCollectionSettings {
  id: string;
  table_id: string;
  is_enabled: boolean;
  public_token: string;
  allow_multiple_submissions: boolean;
  respondent_field_label: string;
  created_at: string;
  updated_at: string;
}

export function useExternalCollection(tableId: string | null) {
  const [settings, setSettings] = useState<ExternalCollectionSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!tableId) {
      setSettings(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('external_collection_settings')
        .select('*')
        .eq('table_id', tableId)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching external collection settings:', error);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const generateToken = () => {
    return crypto.randomUUID();
  };

  const enableCollection = async (options: {
    allowMultipleSubmissions: boolean;
    respondentFieldLabel: string;
  }) => {
    if (!tableId) return null;

    setLoading(true);
    try {
      const token = generateToken();
      
      const { data, error } = await supabase
        .from('external_collection_settings')
        .insert({
          table_id: tableId,
          is_enabled: true,
          public_token: token,
          allow_multiple_submissions: options.allowMultipleSubmissions,
          respondent_field_label: options.respondentFieldLabel,
        })
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast({
        title: 'Coleta externa habilitada',
        description: 'O link público foi gerado com sucesso.',
      });
      
      return data;
    } catch (error: any) {
      console.error('Error enabling external collection:', error);
      toast({
        title: 'Erro ao habilitar coleta',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<{
    is_enabled: boolean;
    allow_multiple_submissions: boolean;
    respondent_field_label: string;
  }>) => {
    if (!settings) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('external_collection_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast({
        title: 'Configurações atualizadas',
        description: 'As alterações foram salvas.',
      });
      
      return data;
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    if (!settings) return null;

    setLoading(true);
    try {
      const newToken = generateToken();
      
      const { data, error } = await supabase
        .from('external_collection_settings')
        .update({ public_token: newToken })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast({
        title: 'Token regenerado',
        description: 'Um novo link público foi gerado. O link anterior não funcionará mais.',
      });
      
      return data;
    } catch (error: any) {
      console.error('Error regenerating token:', error);
      toast({
        title: 'Erro ao regenerar token',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const disableCollection = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('external_collection_settings')
        .delete()
        .eq('id', settings.id);

      if (error) throw error;
      
      setSettings(null);
      toast({
        title: 'Coleta externa desabilitada',
        description: 'O link público não funcionará mais.',
      });
    } catch (error: any) {
      console.error('Error disabling collection:', error);
      toast({
        title: 'Erro ao desabilitar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = () => {
    if (!settings?.public_token) return null;
    // Usar URL publicada para que o formulário seja acessível publicamente
    const publishedUrl = 'https://www.tabili.com.br';
    return `${publishedUrl}/formulario/${settings.public_token}`;
  };

  return {
    settings,
    loading,
    enableCollection,
    updateSettings,
    regenerateToken,
    disableCollection,
    getPublicUrl,
    refetch: fetchSettings,
  };
}
