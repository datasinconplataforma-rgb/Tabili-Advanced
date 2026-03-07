import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestionCache {
  [key: string]: string[];
}

// Global cache to avoid refetching
let globalCache: SuggestionCache = {};
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute

export function useAutocompleteSuggestions() {
  const { user } = useAuth();
  const [allData, setAllData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all custom_data from the user
  const fetchAllData = async () => {
    if (!user) return;
    
    const now = Date.now();
    if (now - lastFetchTime < CACHE_TTL && Object.keys(globalCache).length > 0) {
      return; // Use cache
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_data')
        .select('data')
        .limit(1000); // Limit to prevent performance issues

      if (error) {
        console.error('Error fetching autocomplete data:', error);
        return;
      }

      const records = (data || []).map((row) => row.data as Record<string, string>);
      setAllData(records);
      lastFetchTime = now;
      
      // Build cache from all unique values per field
      const newCache: SuggestionCache = {};
      records.forEach((record) => {
        Object.entries(record).forEach(([field, value]) => {
          if (value && typeof value === 'string' && value.trim()) {
            if (!newCache[field]) {
              newCache[field] = [];
            }
            const trimmed = value.trim();
            if (!newCache[field].includes(trimmed)) {
              newCache[field].push(trimmed);
            }
          }
        });
      });
      globalCache = newCache;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Get suggestions for a specific field and input value
  const getSuggestions = (fieldName: string, inputValue: string, limit: number = 10): string[] => {
    if (!inputValue || inputValue.length < 1) return [];
    
    const fieldValues = globalCache[fieldName] || [];
    const inputLower = inputValue.toLowerCase();
    
    // Filter and sort: prioritize starts with, then contains
    const startsWithMatches: string[] = [];
    const containsMatches: string[] = [];
    
    fieldValues.forEach((val) => {
      const valLower = val.toLowerCase();
      if (valLower === inputLower) return; // Skip exact match
      if (valLower.startsWith(inputLower)) {
        startsWithMatches.push(val);
      } else if (valLower.includes(inputLower)) {
        containsMatches.push(val);
      }
    });

    return [...startsWithMatches, ...containsMatches].slice(0, limit);
  };

  // Get all unique values for a field (for dropdowns/filters)
  const getFieldValues = (fieldName: string): string[] => {
    return globalCache[fieldName] || [];
  };

  // Search across all fields for global search suggestions
  const getGlobalSuggestions = (inputValue: string, limit: number = 10): string[] => {
    if (!inputValue || inputValue.length < 2) return [];
    
    const inputLower = inputValue.toLowerCase();
    const allSuggestions = new Set<string>();
    
    Object.values(globalCache).forEach((fieldValues) => {
      fieldValues.forEach((val) => {
        if (val.toLowerCase().includes(inputLower)) {
          allSuggestions.add(val);
        }
      });
    });

    return Array.from(allSuggestions).slice(0, limit);
  };

  // Refresh cache manually
  const refreshCache = () => {
    lastFetchTime = 0;
    fetchAllData();
  };

  return {
    loading,
    getSuggestions,
    getFieldValues,
    getGlobalSuggestions,
    refreshCache,
  };
}

// Hook for specific table suggestions
export function useTableSuggestions(tableId: string | null) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionCache>({});

  useEffect(() => {
    if (!user || !tableId) {
      setSuggestions({});
      return;
    }

    const fetchTableData = async () => {
      const { data, error } = await supabase
        .from('custom_data')
        .select('data')
        .eq('table_id', tableId)
        .limit(500);

      if (error || !data) return;

      const cache: SuggestionCache = {};
      data.forEach((row) => {
        const record = row.data as Record<string, string>;
        Object.entries(record).forEach(([field, value]) => {
          if (value && typeof value === 'string' && value.trim()) {
            if (!cache[field]) {
              cache[field] = [];
            }
            const trimmed = value.trim();
            if (!cache[field].includes(trimmed)) {
              cache[field].push(trimmed);
            }
          }
        });
      });
      setSuggestions(cache);
    };

    fetchTableData();
  }, [tableId, user]);

  const getSuggestions = (fieldName: string, inputValue: string, limit: number = 10): string[] => {
    if (!inputValue || inputValue.length < 1) return [];
    
    const fieldValues = suggestions[fieldName] || [];
    const inputLower = inputValue.toLowerCase();
    
    const startsWithMatches: string[] = [];
    const containsMatches: string[] = [];
    
    fieldValues.forEach((val) => {
      const valLower = val.toLowerCase();
      if (valLower === inputLower) return;
      if (valLower.startsWith(inputLower)) {
        startsWithMatches.push(val);
      } else if (valLower.includes(inputLower)) {
        containsMatches.push(val);
      }
    });

    return [...startsWithMatches, ...containsMatches].slice(0, limit);
  };

  const getFieldValues = (fieldName: string): string[] => {
    return suggestions[fieldName] || [];
  };

  return { getSuggestions, getFieldValues };
}
