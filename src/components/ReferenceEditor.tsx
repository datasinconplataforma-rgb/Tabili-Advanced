import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomTable, ReferenceConfig } from '@/hooks/useCustomTables';
import { Table2, Columns } from 'lucide-react';

interface ReferenceEditorProps {
  tables: CustomTable[];
  currentTableId?: string; // To prevent referencing itself if desired (optional)
  value: ReferenceConfig | null;
  onChange: (config: ReferenceConfig) => void;
}

export function ReferenceEditor({ tables, currentTableId, value, onChange }: ReferenceEditorProps) {
  const [selectedTableId, setSelectedTableId] = useState(value?.targetTableId || '');
  const [selectedColumnName, setSelectedColumnName] = useState(value?.targetColumnName || '');

  // Update local state when value prop changes (e.g. initial load or reset)
  useEffect(() => {
    if (value) {
      setSelectedTableId(value.targetTableId);
      setSelectedColumnName(value.targetColumnName);
    }
  }, [value]);

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const availableColumns = selectedTable?.columns || [];

  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    setSelectedColumnName(''); // Reset column when table changes
    // Don't trigger onChange yet, wait for column selection
  };

  const handleColumnChange = (columnName: string) => {
    setSelectedColumnName(columnName);
    if (selectedTableId) {
      onChange({
        targetTableId: selectedTableId,
        targetColumnName: columnName,
      });
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Configuração de Referência</Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Tabela de Origem</Label>
          <Select value={selectedTableId} onValueChange={handleTableChange}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {tables.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <Table2 className="h-3 w-3 text-muted-foreground" />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Coluna de Origem</Label>
          <Select 
            value={selectedColumnName} 
            onValueChange={handleColumnChange}
            disabled={!selectedTableId}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {availableColumns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  <div className="flex items-center gap-2">
                    <Columns className="h-3 w-3 text-muted-foreground" />
                    {col.display_name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {selectedTableId && !selectedColumnName && (
        <p className="text-[10px] text-amber-600">Selecione uma coluna para finalizar a conexão.</p>
      )}
    </div>
  );
}