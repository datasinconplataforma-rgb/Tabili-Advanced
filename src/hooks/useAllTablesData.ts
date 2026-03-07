import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TableData {
  [columnName: string]: string;
}

export interface AllTablesData {
  [tableId: string]: TableData[];
}

export function useAllTablesData() {
  const { user } = useAuth();
  const [allTablesData, setAllTablesData] = useState<AllTablesData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllTablesData = async () => {
      if (!user) {
        setAllTablesData({});
        setLoading(false);
        return;
      }

      try {
        // Get all tables for the user
        const { data: tables, error: tablesError } = await supabase
          .from('custom_tables')
          .select('id')
          .eq('user_id', user.id);

        if (tablesError) {
          console.error('Error fetching tables:', tablesError);
          setAllTablesData({});
          return;
        }

        // Fetch data for each table
        const tablesData: AllTablesData = {};
        
        for (const table of tables || []) {
          const { data: rows, error: rowsError } = await supabase
            .from('custom_data')
            .select('data')
            .eq('table_id', table.id);

          if (!rowsError) {
            tablesData[table.id] = rows?.map(row => row.data as TableData) || [];
          }
        }

        setAllTablesData(tablesData);
      } catch (error) {
        console.error('Error fetching all tables data:', error);
        setAllTablesData({});
      } finally {
        setLoading(false);
      }
    };

    fetchAllTablesData();
  }, [user]);

  return { allTablesData, loading };
}