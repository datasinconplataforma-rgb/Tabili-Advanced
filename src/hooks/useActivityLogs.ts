import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  table_id: string | null;
  table_name: string;
  action: string;
  details: string | null;
  created_at: string;
}

export function useActivityLogs() {
  const { user } = useAuth();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching logs:', error);
        return [];
      }

      return data as ActivityLog[];
    },
    enabled: !!user,
  });

  return { logs, isLoading, refetch };
}

// Helper function to log activities
export async function logActivity(
  userId: string,
  userEmail: string,
  tableId: string | null,
  tableName: string,
  action: string,
  details?: string
) {
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      user_email: userEmail,
      table_id: tableId,
      table_name: tableName,
      action,
      details,
    });

  if (error) {
    console.error('Error logging activity:', error);
  }
}
