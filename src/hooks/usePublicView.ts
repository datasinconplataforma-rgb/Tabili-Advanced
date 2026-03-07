import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface FilterConfig {
  column: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
}

export type FilterLogic = 'AND' | 'OR';

export interface MultiFilterConfig {
  filters: FilterConfig[];
  logic: FilterLogic;
}

interface PublicViewSettings {
  id: string;
  table_id: string;
  is_enabled: boolean;
  public_token: string;
  visible_columns: string[];
  filter_config: MultiFilterConfig | null;
  access_pin: string | null;
  created_at: string;
  updated_at: string;
}

function parseFilterConfig(json: Json | null | undefined): MultiFilterConfig | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  
  // Handle new multi-filter format
  if (Array.isArray(obj.filters)) {
    const filters = (obj.filters as unknown[]).filter((f): f is FilterConfig => {
      if (!f || typeof f !== 'object') return false;
      const filter = f as Record<string, unknown>;
      return typeof filter.column === 'string' && 
             typeof filter.operator === 'string' && 
             typeof filter.value === 'string';
    });
    if (filters.length > 0) {
      return {
        filters,
        logic: (obj.logic === 'OR' ? 'OR' : 'AND') as FilterLogic,
      };
    }
    return null;
  }
  
  // Handle legacy single filter format (migration)
  if (
    typeof obj.column === 'string' &&
    typeof obj.operator === 'string' &&
    typeof obj.value === 'string'
  ) {
    return {
      filters: [{
        column: obj.column,
        operator: obj.operator as FilterConfig['operator'],
        value: obj.value,
      }],
      logic: 'AND',
    };
  }
  return null;
}

export function usePublicView(tableId: string | null) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PublicViewSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!tableId) {
      setSettings(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_view_settings')
        .select('*')
        .eq('table_id', tableId)
        .maybeSingle();

      if (error) throw error;
      
      // Parse settings from database
      if (data) {
        setSettings({
          ...data,
          visible_columns: data.visible_columns || [],
          filter_config: parseFilterConfig(data.filter_config),
          access_pin: data.access_pin || null,
        });
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error('Error fetching public view settings:', error);
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

  const enableView = async (visibleColumns: string[], filterConfig: MultiFilterConfig | null = null, accessPin: string | null = null) => {
    if (!tableId) return;

    setLoading(true);
    try {
      const token = generateToken();
      
      const { data, error } = await supabase
        .from('public_view_settings')
        .upsert({
          table_id: tableId,
          is_enabled: true,
          public_token: token,
          visible_columns: visibleColumns,
          filter_config: filterConfig as unknown as Json,
          access_pin: accessPin,
        }, {
          onConflict: 'table_id',
        })
        .select()
        .single();

      if (error) throw error;

      setSettings({
        ...data,
        visible_columns: data.visible_columns || [],
        filter_config: parseFilterConfig(data.filter_config),
        access_pin: data.access_pin || null,
      });

      toast({
        title: 'Visualização pública habilitada!',
        description: 'O link público foi gerado com sucesso.',
      });
    } catch (error) {
      console.error('Error enabling public view:', error);
      toast({
        title: 'Erro ao habilitar visualização',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (visibleColumns: string[], filterConfig: MultiFilterConfig | null, accessPin: string | null = null) => {
    if (!tableId || !settings) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('public_view_settings')
        .update({
          visible_columns: visibleColumns,
          filter_config: filterConfig as unknown as Json,
          access_pin: accessPin,
        })
        .eq('table_id', tableId)
        .select()
        .single();

      if (error) throw error;

      setSettings({
        ...data,
        visible_columns: data.visible_columns || [],
        filter_config: parseFilterConfig(data.filter_config),
        access_pin: data.access_pin || null,
      });

      toast({
        title: 'Configurações atualizadas!',
        description: 'As configurações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Erro ao atualizar configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const disableView = async () => {
    if (!tableId || !settings) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('public_view_settings')
        .update({ is_enabled: false })
        .eq('table_id', tableId);

      if (error) throw error;

      setSettings({ ...settings, is_enabled: false });

      toast({
        title: 'Visualização pública desabilitada',
        description: 'O link público não está mais acessível.',
      });
    } catch (error) {
      console.error('Error disabling public view:', error);
      toast({
        title: 'Erro ao desabilitar visualização',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    if (!tableId || !settings) return;

    setLoading(true);
    try {
      const newToken = generateToken();
      
      const { data, error } = await supabase
        .from('public_view_settings')
        .update({ public_token: newToken })
        .eq('table_id', tableId)
        .select()
        .single();

      if (error) throw error;

      setSettings({
        ...data,
        visible_columns: data.visible_columns || [],
        filter_config: parseFilterConfig(data.filter_config),
        access_pin: data.access_pin || null,
      });

      toast({
        title: 'Link regenerado!',
        description: 'O link anterior foi invalidado.',
      });
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast({
        title: 'Erro ao regenerar link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = () => {
    if (!settings?.public_token || !settings.is_enabled) return null;
    // Use production domain to avoid authentication issues in preview
    return `https://www.tabili.com.br/visualizar/${settings.public_token}`;
  };

  return {
    settings,
    loading,
    enableView,
    updateSettings,
    disableView,
    regenerateToken,
    getPublicUrl,
    refetch: fetchSettings,
  };
}
