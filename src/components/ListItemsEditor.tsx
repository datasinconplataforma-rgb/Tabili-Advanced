import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { ListConfig } from '@/hooks/useCustomTables';

interface ListItemsEditorProps {
  value: ListConfig | null;
  onChange: (config: ListConfig | null) => void;
}

export function ListItemsEditor({ value, onChange }: ListItemsEditorProps) {
  const [newItem, setNewItem] = useState('');
  
  const items = value?.items || [];

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    
    // Avoid duplicates
    if (items.includes(newItem.trim())) {
      setNewItem('');
      return;
    }
    
    onChange({ items: [...items, newItem.trim()] });
    setNewItem('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems.length > 0 ? { items: newItems } : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Itens da Lista</Label>
      
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite um item..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={!newItem.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemoveItem(index)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum item adicionado. Adicione pelo menos um item para a lista.
        </p>
      )}
    </div>
  );
}
