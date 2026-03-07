import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PublicColumn {
  id: string;
  name: string;
  display_name: string;
  column_type: string;
  column_order: number;
  formula_config: Record<string, unknown> | null;
  list_config: { items: string[] } | null;
}

interface PublicViewData {
  table_name: string;
  columns: PublicColumn[];
  data: Array<{
    id: string;
    data: Record<string, string>;
  }>;
}

export function usePublicViewData() {
  const [viewData, setViewData] = useState<PublicViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresPin, setRequiresPin] = useState(false);

  const fetchViewByToken = useCallback(async (token: string, pin?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Call the edge function directly via fetch to handle non-2xx responses properly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/get-public-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ token, pin }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        if (data.requires_pin) {
          setRequiresPin(true);
          if (data.error !== 'pin_required') {
            setError(data.error);
          }
        } else {
          setError(data.error || 'Erro ao carregar visualização');
        }
        setViewData(null);
      } else {
        setRequiresPin(false);
        setViewData(data);
      }
    } catch (err) {
      console.error('Error fetching public view:', err);
      setError('Erro ao carregar visualização');
      setViewData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    viewData,
    loading,
    error,
    requiresPin,
    fetchViewByToken,
  };
}
