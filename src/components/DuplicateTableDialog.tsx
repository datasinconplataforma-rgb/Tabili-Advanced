import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import { CustomTable, ColumnType } from '@/hooks/useCustomTables';

interface DuplicateTableDialogProps {
  table: CustomTable | null;
  isOpen: boolean;
  onClose: () => void;
  existingTableNames: string[];
  onDuplicate: (name: string, columns: { name: string; display_name: string; column_type: ColumnType }[]) => Promise<string | null>;
}

export function DuplicateTableDialog({ 
  table, 
  isOpen, 
  onClose, 
  existingTableNames,
  onDuplicate 
}: DuplicateTableDialogProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (table && isOpen) {
      setNewName(`${table.name} (Cópia)`);
      setError('');
    }
  }, [table, isOpen]);

  const validateName = (name: string) => {
    const trimmedName = name.trim().toLowerCase();
    const isDuplicate = existingTableNames.some(
      existingName => existingName.toLowerCase() === trimmedName
    );
    
    if (isDuplicate) {
      setError('Já existe uma tabela com este nome');
      return false;
    }
    
    if (!name.trim()) {
      setError('O nome da tabela é obrigatório');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleNameChange = (value: string) => {
    setNewName(value);
    if (value.trim()) {
      validateName(value);
    } else {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!table || !validateName(newName)) return;

    setIsSubmitting(true);
    
    // Copy columns without formula_config (formulas reference specific table IDs)
    const columnsToCreate = table.columns
      .filter(col => col.column_type !== 'formula')
      .map(col => ({
        name: col.name,
        display_name: col.display_name,
        column_type: col.column_type,
      }));

    const result = await onDuplicate(newName.trim(), columnsToCreate);
    
    setIsSubmitting(false);
    
    if (result) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Tabela
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newTableName">Nome da Nova Tabela</Label>
            <Input
              id="newTableName"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Digite o nome da nova tabela"
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {table && (
            <div className="text-sm text-muted-foreground">
              <p>Serão copiadas {table.columns.filter(c => c.column_type !== 'formula').length} coluna(s):</p>
              <ul className="mt-1 list-disc list-inside">
                {table.columns
                  .filter(c => c.column_type !== 'formula')
                  .slice(0, 5)
                  .map(col => (
                    <li key={col.id}>{col.display_name}</li>
                  ))}
                {table.columns.filter(c => c.column_type !== 'formula').length > 5 && (
                  <li>... e mais {table.columns.filter(c => c.column_type !== 'formula').length - 5}</li>
                )}
              </ul>
              {table.columns.some(c => c.column_type === 'formula') && (
                <p className="mt-2 text-xs text-amber-500">
                  Nota: Colunas de fórmula não serão copiadas pois referenciam a tabela original.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !!error || !newName.trim()}
              className="gap-1"
            >
              <Copy className="h-4 w-4" />
              {isSubmitting ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
