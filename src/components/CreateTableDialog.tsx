import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Table, Calculator, List, Link } from 'lucide-react';
import { ColumnType, FormulaConfig, ListConfig, ReferenceConfig } from '@/hooks/useCustomTables';
import { FormulaEditor } from './FormulaEditor';
import { ListItemsEditor } from './ListItemsEditor';
import { ReferenceEditor } from './ReferenceEditor';
import { useCustomTables } from '@/hooks/useCustomTables';

// Define all column types including formula
export const COLUMN_TYPES: { value: ColumnType; label: string; icon?: React.ReactNode }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'time', label: 'Hora' },
  { value: 'email', label: 'E-mail' },
  { value: 'url', label: 'Link/URL' },
  { value: 'currency', label: 'Moeda' },
  { value: 'list', label: 'Lista', icon: <List className="h-3 w-3" /> },
  { value: 'reference', label: 'Referência', icon: <Link className="h-3 w-3" /> },
  { value: 'formula', label: 'Fórmula', icon: <Calculator className="h-3 w-3" /> },
];

interface ColumnDef {
  name: string;
  display_name: string;
  column_type: ColumnType;
  required: boolean;
  list_config?: ListConfig | null;
  formula_config?: FormulaConfig | null;
  reference_config?: ReferenceConfig | null;
}

interface CreateTableDialogProps {
  onCreateTable: (name: string, columns: { name: string; display_name: string; column_type: ColumnType; required?: boolean; list_config?: ListConfig; formula_config?: FormulaConfig; reference_config?: ReferenceConfig }[]) => Promise<string | null>;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function CreateTableDialog({ onCreateTable, externalOpen, onExternalOpenChange }: CreateTableDialogProps) {
  const { tables } = useCustomTables();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (v: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(v);
    setInternalOpen(v);
  };
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDef[]>([
    { name: '', display_name: '', column_type: 'text' as ColumnType, required: false },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedColumn, setExpandedColumn] = useState<number | null>(null);

  const handleAddColumn = () => {
    setColumns([...columns, { name: '', display_name: '', column_type: 'text' as ColumnType, required: false }]);
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
      if (expandedColumn === index) setExpandedColumn(null);
    }
  };

  const handleColumnChange = (index: number, field: keyof ColumnDef, value: any) => {
    const newColumns = [...columns];
    if (field === 'column_type') {
      newColumns[index].column_type = value as ColumnType;
      
      // Handle special types expanding
      if (value === 'list' || value === 'formula' || value === 'reference') {
        setExpandedColumn(index);
      } else if (expandedColumn === index) {
        // Only collapse if we are changing away from a special type
        setExpandedColumn(null);
        newColumns[index].list_config = undefined;
        newColumns[index].formula_config = undefined;
        newColumns[index].reference_config = undefined;
      }
    } else {
      (newColumns[index] as any)[field] = value;
    }
    // Auto-generate name from display_name
    if (field === 'display_name') {
      newColumns[index].name = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
    setColumns(newColumns);
  };

  const handleListConfigChange = (index: number, config: ListConfig | null) => {
    const newColumns = [...columns];
    newColumns[index].list_config = config;
    setColumns(newColumns);
  };

  const handleFormulaConfigChange = (index: number, config: FormulaConfig | null) => {
    const newColumns = [...columns];
    newColumns[index].formula_config = config;
    setColumns(newColumns);
  };

  const handleReferenceConfigChange = (index: number, config: ReferenceConfig | null) => {
    const newColumns = [...columns];
    newColumns[index].reference_config = config;
    setColumns(newColumns);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim() || columns.some((c) => !c.display_name.trim())) return;
    
    // Validate list columns have items
    const hasInvalidList = columns.some(
      c => c.column_type === 'list' && (!c.list_config?.items || c.list_config.items.length === 0)
    );
    if (hasInvalidList) return;

    // Validate reference columns have target
    const hasInvalidRef = columns.some(
      c => c.column_type === 'reference' && (!c.reference_config?.targetTableId || !c.reference_config.targetColumnName)
    );
    if (hasInvalidRef) return;

    setIsSubmitting(true);
    
    // Transform columns for submission
    const columnsToSubmit = columns
      .filter((c) => c.display_name.trim())
      .map(c => ({
        name: c.name,
        display_name: c.display_name,
        column_type: c.column_type,
        required: c.required,
        list_config: c.list_config || undefined,
        formula_config: c.formula_config || undefined,
        reference_config: c.reference_config || undefined,
      }));

    const result = await onCreateTable(
      tableName, 
      columnsToSubmit
    );
    setIsSubmitting(false);

    if (result) {
      setTableName('');
      setColumns([{ name: '', display_name: '', column_type: 'text', required: false }]);
      setExpandedColumn(null);
      setIsOpen(false);
    }
  };

  // Mock table for FormulaEditor
  const mockTableForFormula = {
    id: 'new_table',
    name: tableName || 'Nova Tabela',
    columns: columns.map((c, i) => ({
      id: `col_${i}`,
      table_id: 'new_table',
      name: c.name || `col_${i}`,
      display_name: c.display_name || `Coluna ${i + 1}`,
      column_order: i,
      column_type: c.column_type,
      required: false,
    })),
    user_id: '',
    is_owner: true,
    permission: 'owner' as const,
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
            <Table className="h-4 w-4" />
            Nova Tabela
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Tabela</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tableName">Nome da Tabela</Label>
            <Input
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Ex: Clientes, Produtos, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Colunas</Label>
            <div className="space-y-4">
              {columns.map((col, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome da Coluna</Label>
                      <Input
                        value={col.display_name}
                        onChange={(e) => handleColumnChange(index, 'display_name', e.target.value)}
                        placeholder={`Coluna ${index + 1}`}
                      />
                    </div>
                    <div className="w-[140px] space-y-1">
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Select
                        value={col.column_type}
                        onValueChange={(value) => handleColumnChange(index, 'column_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMN_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-1.5">
                                {type.icon}
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id={`required-${index}`} 
                          checked={col.required}
                          onCheckedChange={(checked) => handleColumnChange(index, 'required', !!checked)}
                        />
                        <label
                          htmlFor={`required-${index}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Obrigatório
                        </label>
                      </div>
                      {columns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive ml-2"
                          onClick={() => handleRemoveColumn(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* List Configuration */}
                  {col.column_type === 'list' && (
                    <div className="mt-2 p-3 border rounded-md bg-background">
                      <ListItemsEditor
                        value={col.list_config || null}
                        onChange={(config) => handleListConfigChange(index, config)}
                      />
                    </div>
                  )}

                  {/* Reference Configuration */}
                  {col.column_type === 'reference' && (
                    <div className="mt-2 p-3 border rounded-md bg-background">
                      <ReferenceEditor
                        tables={tables}
                        currentTableId="new_table"
                        value={col.reference_config || null}
                        onChange={(config) => handleReferenceConfigChange(index, config)}
                      />
                    </div>
                  )}

                  {/* Formula Configuration */}
                  {col.column_type === 'formula' && (
                    <div className="mt-2 p-3 border rounded-md bg-background">
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Editor de Fórmula (use colunas criadas acima)
                      </Label>
                      <FormulaEditor
                        tables={[mockTableForFormula]}
                        currentTableId="new_table"
                        value={col.formula_config || null}
                        onChange={(config) => handleFormulaConfigChange(index, config)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddColumn} className="gap-1 mt-2">
              <Plus className="h-4 w-4" />
              Adicionar Coluna
            </Button>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !tableName.trim()}>
            {isSubmitting ? 'Criando...' : 'Criar Tabela'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}