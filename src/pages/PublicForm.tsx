import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicFormSubmission } from '@/hooks/usePublicFormSubmission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, Send, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

export default function PublicForm() {
  const { token } = useParams<{ token: string }>();
  const {
    loading,
    formData,
    error,
    submitted,
    alreadySubmitted,
    fetchFormByToken,
    submitForm,
    reset,
  } = usePublicFormSubmission();

  const [respondentIdentifier, setRespondentIdentifier] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchFormByToken(token);
    }
  }, [token, fetchFormByToken]);

  const handleInputChange = (columnName: string, value: string) => {
    setFormValues(prev => ({ ...prev, [columnName]: value }));
    // Clear validation error when user types
    if (validationErrors[columnName]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[columnName];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validate respondent identifier
    if (!respondentIdentifier.trim()) {
      errors['respondent'] = 'Este campo é obrigatório';
    } else if (respondentIdentifier.length > 255) {
      errors['respondent'] = 'Máximo de 255 caracteres';
    }

    // Validate each column
    formData?.columns.forEach(column => {
      const value = formValues[column.name] || '';
      
      if (column.column_type === 'number' && value) {
        if (isNaN(Number(value))) {
          errors[column.name] = 'Deve ser um número válido';
        }
      }
      
      if (column.column_type === 'date' && value) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          errors[column.name] = 'Formato de data inválido';
        }
      }

      // Max length validation
      if (value.length > 1000) {
        errors[column.name] = 'Máximo de 1000 caracteres';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !token) return;

    setIsSubmitting(true);
    await submitForm(token, respondentIdentifier.trim(), formValues);
    setIsSubmitting(false);
  };

  const getInputType = (columnType: string) => {
    switch (columnType) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      default:
        return 'text';
    }
  };

  // Loading state
  if (loading && !formData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error && !formData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Formulário Indisponível</h2>
            <p className="text-muted-foreground text-center">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted state
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Resposta Já Enviada</h2>
            <p className="text-muted-foreground text-center">
              Você já enviou uma resposta para este formulário.
              Este formulário permite apenas um envio por pessoa.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleNewSubmission = () => {
    setFormValues({});
    setRespondentIdentifier('');
    setValidationErrors({});
    reset();
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enviado com Sucesso!</h2>
            <p className="text-muted-foreground text-center mb-4">
              Sua resposta foi registrada. Obrigado por participar!
            </p>
            {formData?.settings.allow_multiple_submissions && (
              <Button onClick={handleNewSubmission} variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Enviar outra resposta
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  if (!formData) return null;

  const sortedColumns = [...formData.columns]
    .filter(col => col.column_type !== 'formula')
    .sort((a, b) => a.column_order - b.column_order);

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{formData.table_name}</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para enviar sua resposta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Respondent identifier field */}
              <div className="space-y-2">
                <Label htmlFor="respondent" className="flex items-center gap-1">
                  {formData.settings.respondent_field_label}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="respondent"
                  value={respondentIdentifier}
                  onChange={(e) => {
                    setRespondentIdentifier(e.target.value);
                    if (validationErrors['respondent']) {
                      setValidationErrors(prev => {
                        const next = { ...prev };
                        delete next['respondent'];
                        return next;
                      });
                    }
                  }}
                  placeholder={`Digite seu ${formData.settings.respondent_field_label.toLowerCase()}`}
                  className={validationErrors['respondent'] ? 'border-destructive' : ''}
                  maxLength={255}
                />
                {validationErrors['respondent'] && (
                  <p className="text-sm text-destructive">{validationErrors['respondent']}</p>
                )}
              </div>

              {/* Dynamic form fields */}
              {sortedColumns.map((column) => (
                <div key={column.id} className="space-y-2">
                  <Label htmlFor={column.name}>
                    {column.display_name}
                  </Label>
                  {column.column_type === 'list' && column.list_config?.items ? (
                    <Select
                      value={formValues[column.name] || ''}
                      onValueChange={(value) => handleInputChange(column.name, value)}
                    >
                      <SelectTrigger className={validationErrors[column.name] ? 'border-destructive' : ''}>
                        <SelectValue placeholder={`Selecione ${column.display_name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {column.list_config.items.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={column.name}
                      type={getInputType(column.column_type)}
                      value={formValues[column.name] || ''}
                      onChange={(e) => handleInputChange(column.name, e.target.value)}
                      className={validationErrors[column.name] ? 'border-destructive' : ''}
                      maxLength={1000}
                    />
                  )}
                  {validationErrors[column.name] && (
                    <p className="text-sm text-destructive">{validationErrors[column.name]}</p>
                  )}
                </div>
              ))}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Resposta
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Este formulário é protegido e seus dados serão tratados com segurança.
        </p>
      </div>
    </div>
  );
}
