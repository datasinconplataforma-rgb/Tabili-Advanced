import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublicFormData {
  table_id: string;
  table_name: string;
  columns: Array<{
    id: string;
    name: string;
    display_name: string;
    column_type: string;
    column_order: number;
    list_config?: {
      items: string[];
    };
  }>;
  settings: {
    allow_multiple_submissions: boolean;
    respondent_field_label: string;
  };
}

export function usePublicFormSubmission() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PublicFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const fetchFormByToken = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-public-form', {
        body: { token },
      });

      if (fnError) throw fnError;
      
      if (!data || data.error) {
        setError(data?.error || 'Formulário não encontrado');
        return null;
      }

      setFormData(data);
      return data;
    } catch (err: any) {
      console.error('Error fetching form:', err);
      setError('Formulário não encontrado ou inativo');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPreviousSubmission = useCallback(async (token: string, respondentIdentifier: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('check-submission', {
        body: { token, respondent_identifier: respondentIdentifier },
      });

      if (fnError) throw fnError;
      
      if (data?.has_submitted) {
        setAlreadySubmitted(true);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error checking submission:', err);
      return false;
    }
  }, []);

  const submitForm = useCallback(async (
    token: string,
    respondentIdentifier: string,
    formValues: Record<string, any>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('submit-public-form', {
        body: {
          token,
          respondent_identifier: respondentIdentifier,
          data: formValues,
        },
      });

      if (fnError) throw fnError;
      
      if (data?.error) {
        if (data.error === 'already_submitted') {
          setAlreadySubmitted(true);
          setError('Você já enviou uma resposta para este formulário.');
        } else {
          setError(data.error);
        }
        return false;
      }

      setSubmitted(true);
      return true;
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError('Erro ao enviar formulário. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSubmitted(false);
    setAlreadySubmitted(false);
    setError(null);
  }, []);

  return {
    loading,
    formData,
    error,
    submitted,
    alreadySubmitted,
    fetchFormByToken,
    checkPreviousSubmission,
    submitForm,
    reset,
  };
}
