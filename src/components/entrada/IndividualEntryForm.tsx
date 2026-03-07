import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Calculator, List, Link } from 'lucide-react';
import type { ColumnType, CustomColumn } from '@/hooks/useCustomTables';
import { evaluateFormula } from '@/components/FormulaEditor';
import { useTableSuggestions } from '@/hooks/useAutocompleteSuggestions';

type Column = CustomColumn;

interface IndividualEntryFormProps {
  columns: Column[];
  onAddToReview: (data: Record<string, string>) => void;
  getSuggestions: (columnName: string, value: string) => string[];
  allTablesData?: Record<string, Record<string, string>[]>;
}

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

// Internal component to handle reference fetching
function ReferenceSelect({ 
  value, 
  onChange, 
  targetTableId, 
  targetColumnName,
  placeholder,
  className
}: { 
  value: string, 
  onChange: (val: string) => void, 
  targetTableId: string, 
  targetColumnName: string,
  placeholder?: string,
  className?: string
}) {
  const { getFieldValues } = useTableSuggestions(targetTableId);
  const options = getFieldValues(targetColumnName);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function IndividualEntryForm({ columns, onAddToReview, getSuggestions, allTablesData }: IndividualEntryFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    columns.forEach((col) => {
      initial[col.name] = '';
    });
    return initial;
  });
  
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleInputChange = (columnName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [columnName]: value }));
    if (errors[columnName]) {
      setErrors(prev => ({ ...prev, [columnName]: false }));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startColumnIndex: number) => {
    const pastedData = e.clipboardData.getData('text');
    
    if (pastedData.includes('\t')) {
      e.preventDefault();
      const values = pastedData.split('\t').map(v => v.replace(/\r?\n/g, '').trim());
      
      const updates: Record<string, string> = {};
      values.forEach((value, i) => {
        const colIndex = startColumnIndex + i;
        if (colIndex < columns.length) {
          updates[columns[colIndex].name] = value;
        }
      });
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, boolean> = {};
    let hasError = false;

    columns.forEach(col => {
      if (col.required && !formData[col.name]?.trim()) {
        newErrors[col.name] = true;
        hasError = true;
      }
    });

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // Check if at least one field has data (if no required fields)
    const hasData = Object.values(formData).some((v) => v.trim());
    if (!hasData && Object.keys(newErrors).length === 0) return;

    // Evaluate formulas before adding to review
    const finalData = { ...formData };
    columns.forEach(col => {
      if (col.column_type === 'formula' && col.formula_config) {
        const result = evaluateFormula(col.formula_config, formData, allTablesData);
        if (result !== null && result !== undefined) {
          finalData[col.name] = String(result);
        }
      }
    });

    onAddToReview(finalData);
    
    // Clear form
    const reset: Record<string, string> = {};
    columns.forEach((col) => {
      reset[col.name] = '';
    });
    setFormData(reset);
    setErrors({});
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Novo Registro</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {columns.map((col, colIndex) => {
              const inputProps = getInputProps(col.column_type);
              const suggestions = getSuggestions(col.name, formData[col.name] || '');
              const useAutocomplete = col.column_type === 'text' || !col.column_type;
              const isFormulaColumn = col.column_type === 'formula';
              const isListColumn = col.column_type === 'list';
              const isReferenceColumn = col.column_type === 'reference';
              const hasError = errors[col.name];
              
              return (
                <div key={col.id} className="space-y-1.5">
                  <Label htmlFor={col.name} className="text-sm flex items-center gap-1">
                    {isFormulaColumn && <Calculator className="h-3 w-3 text-primary" />}
                    {isListColumn && <List className="h-3 w-3 text-primary" />}
                    {isReferenceColumn && <Link className="h-3 w-3 text-primary" />}
                    {col.display_name}
                    {col.required && <span className="text-destructive">*</span>}
                  </Label>
                  
                  {isFormulaColumn && col.formula_config ? (
                    <div className="h-9 px-3 flex items-center bg-muted/50 rounded-md text-primary font-medium border">
                      {(() => {
                        const result = evaluateFormula(col.formula_config, formData, allTablesData);
                        if (result !== null) {
                          if (typeof result === 'number') {
                            return new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(result);
                          }
                          return result;
                        }
                        return 'Preencha os campos';
                      })()}
                    </div>
                  ) : isReferenceColumn && col.reference_config ? (
                    <ReferenceSelect
                      value={formData[col.name] || ''}
                      onChange={(value) => handleInputChange(col.name, value)}
                      targetTableId={col.reference_config.targetTableId}
                      targetColumnName={col.reference_config.targetColumnName}
                      placeholder={`Selecione ${col.display_name.toLowerCase()}`}
                      className={`h-9 ${hasError ? 'border-destructive' : ''}`}
                    />
                  ) : isListColumn && col.list_config?.items ? (
                    <Select
                      value={formData[col.name] || ''}
                      onValueChange={(value) => handleInputChange(col.name, value)}
                    >
                      <SelectTrigger className={`h-9 ${hasError ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder={`Selecione ${col.display_name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {col.list_config.items.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : useAutocomplete ? (
                    <AutocompleteInput
                      id={col.name}
                      value={formData[col.name] || ''}
                      onChange={(e) => handleInputChange(col.name, e.target.value)}
                      onPaste={(e) => handlePaste(e, colIndex)}
                      suggestions={suggestions}
                      placeholder={col.display_name}
                      className={`h-9 ${hasError ? 'border-destructive' : ''}`}
                    />
                  ) : (
                    <Input
                      id={col.name}
                      {...inputProps}
                      value={formData[col.name] || ''}
                      onChange={(e) => handleInputChange(col.name, e.target.value)}
                      onPaste={(e) => handlePaste(e, colIndex)}
                      placeholder={col.display_name}
                      className={`h-9 ${hasError ? 'border-destructive' : ''}`}
                    />
                  )}
                  {hasError && (
                    <span className="text-[10px] text-destructive">Campo obrigatório</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Adicionar à Lista
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}