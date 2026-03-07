import { useState, useEffect } from 'react';
import { useCustomTables } from '@/hooks/useCustomTables';
import { useTableSuggestions } from '@/hooks/useAutocompleteSuggestions';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { Loader2, Users, Plus, List, Send, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ColumnType } from '@/hooks/useCustomTables';

const menuItems: ModuleMenuItem[] = [
  { id: "cadastro", label: "Cadastrar Cliente", icon: Plus, href: "/clientes" },
  { id: "consulta", label: "Consultar Clientes", icon: List, href: "/clientes/consulta" },
];

// Helper to get input props based on column type
const getInputProps = (columnType: ColumnType) => {
  switch (columnType) {
    case 'number':
      return { type: 'number', step: 'any' };
    case 'date':
      return { type: 'date' };
    case 'time':
      return { type: 'time' };
    case 'email':
      return { type: 'email' };
    case 'url':
      return { type: 'url' };
    case 'currency':
      return { type: 'number', step: '0.01', min: '0' };
    default:
      return { type: 'text' };
  }
};

export default function ClientesCadastro() {
  const { user } = useAuth();
  const { tables, loading: tablesLoading } = useCustomTables();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the "clientes" table (case-insensitive)
  const clientesTable = tables.find(
    (t) => t.name.toLowerCase() === 'clientes'
  );

  const { getSuggestions } = useTableSuggestions(clientesTable?.id || null);

  // Initialize form when table is found
  useEffect(() => {
    if (clientesTable) {
      const initial: Record<string, string> = {};
      clientesTable.columns.forEach((col) => {
        initial[col.name] = '';
      });
      setFormData(initial);
    }
  }, [clientesTable]);

  const handleInputChange = (columnName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [columnName]: value }));
  };

  // Handle paste for form - fills subsequent fields with tab-separated data
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startColumnIndex: number) => {
    const pastedData = e.clipboardData.getData('text');
    
    if (pastedData.includes('\t')) {
      e.preventDefault();
      const values = pastedData.split('\t').map(v => v.replace(/\r?\n/g, '').trim());
      
      if (clientesTable) {
        const updates: Record<string, string> = {};
        values.forEach((value, i) => {
          const colIndex = startColumnIndex + i;
          if (colIndex < clientesTable.columns.length) {
            updates[clientesTable.columns[colIndex].name] = value;
          }
        });
        setFormData((prev) => ({ ...prev, ...updates }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientesTable || !user) return;

    setIsSubmitting(true);
    try {
      // Save to custom_data table (Gestão de Tabelas)
      const { error } = await supabase.from('custom_data').insert({
        table_id: clientesTable.id,
        user_id: user.id,
        data: formData,
      });

      if (error) throw error;

      // Clear form after successful submit
      const reset: Record<string, string> = {};
      clientesTable.columns.forEach((col) => {
        reset[col.name] = '';
      });
      setFormData(reset);

      toast({ title: 'Cliente cadastrado com sucesso!' });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao cadastrar cliente', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormEmpty = Object.values(formData).every((v) => !v.trim());

  return (
    <ModuleSidebarLayout
      moduleName="Clientes"
      moduleIcon={Users}
      menuItems={menuItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadastrar Cliente</h1>
          <p className="text-muted-foreground">Adicione novos clientes ao sistema</p>
        </div>

        {tablesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !clientesTable ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
              <p className="text-muted-foreground text-center mb-2">
                Tabela "clientes" não encontrada.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Crie uma tabela chamada "clientes" na Gestão de Tabelas para usar este módulo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Novo Cliente
              </CardTitle>
              <CardDescription>
                Preencha os dados do cliente. Os dados serão salvos na tabela "clientes".
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {clientesTable.columns.map((col, colIndex) => {
                    const inputProps = getInputProps(col.column_type);
                    const suggestions = getSuggestions(col.name, formData[col.name] || '');
                    const useAutocomplete = col.column_type === 'text' || !col.column_type;
                    
                    return (
                      <div key={col.id} className="space-y-2">
                        <Label htmlFor={col.name}>{col.display_name}</Label>
                        {useAutocomplete ? (
                          <AutocompleteInput
                            id={col.name}
                            value={formData[col.name] || ''}
                            onChange={(e) => handleInputChange(col.name, e.target.value)}
                            onPaste={(e) => handlePaste(e, colIndex)}
                            suggestions={suggestions}
                            placeholder={`Digite ${col.display_name.toLowerCase()}`}
                          />
                        ) : (
                          <Input
                            id={col.name}
                            {...inputProps}
                            value={formData[col.name] || ''}
                            onChange={(e) => handleInputChange(col.name, e.target.value)}
                            onPaste={(e) => handlePaste(e, colIndex)}
                            placeholder={`Digite ${col.display_name.toLowerCase()}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || isFormEmpty}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Cadastrar Cliente
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleSidebarLayout>
  );
}