import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  details: string | null;
  severity: SecurityEventSeverity;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useSecurityLogging() {
  const { user } = useAuth();

  const getIPInfo = (): { ip: string | null; userAgent: string | null } => {
    // No browser environment, we can't get real IP without a server request
    // This would typically be handled in Edge Functions or backend services
    return {
      ip: null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    };
  };

  const logSecurityEvent = async (
    action: string,
    details: string | null = null,
    severity: SecurityEventSeverity = 'low'
  ): Promise<void> => {
    if (!user) return;

    const { ip, userAgent } = getIPInfo();

    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_email: user.email || 'unknown',
        table_name: 'security',
        action: `[${severity}] ${action}`,
        details: [details, userAgent ? `UA: ${userAgent}` : null, ip ? `IP: ${ip}` : null].filter(Boolean).join(' | '),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - security logging shouldn't break main functionality
    }
  };

  const logUnauthorizedAccessAttempt = async (
    resource: string,
    resourceId: string | null = null
  ): Promise<void> => {
    const details = resourceId ? `Tentativa de acesso a ${resource} (${resourceId})` : `Tentativa de acesso a ${resource}`;
    await logSecurityEvent('Acesso não autorizado', details, 'high');
  };

  const logSuspiciousActivity = async (
    activity: string,
    details: string | null = null
  ): Promise<void> => {
    await logSecurityEvent(`Atividade suspeita: ${activity}`, details, 'medium');
  };

  const logDataExport = async (
    tableName: string,
    rowCount: number,
    exportType: 'pdf' | 'excel' | 'csv'
  ): Promise<void> => {
    await logSecurityEvent(
      'Exportação de dados',
      `Exportou ${rowCount} linhas da tabela ${tableName} como ${exportType}`,
      'low'
    );
  };

  const logFormulaEvaluation = async (
    formulaExpression: string,
  ): Promise<void> => {
    await logSecurityEvent(
      'Avaliação de fórmula',
      `Executou fórmula: ${formulaExpression.substring(0, 100)}${formulaExpression.length > 100 ? '...' : ''}`,
      'low'
    );
  };

  return {
    logSecurityEvent,
    logUnauthorizedAccessAttempt,
    logSuspiciousActivity,
    logDataExport,
    logFormulaEvaluation
  };
}