import { FileInput, List } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type EntryMode = 'individual' | 'batch' | null;

interface EntryModeSelectorProps {
  selectedMode: EntryMode;
  onSelectMode: (mode: EntryMode) => void;
}

export function EntryModeSelector({ selectedMode, onSelectMode }: EntryModeSelectorProps) {
  const modes = [
    {
      id: 'individual' as const,
      title: 'Lançamento Individual',
      description: 'Adicione registros um a um com formulário e revise antes de enviar',
      icon: FileInput,
    },
    {
      id: 'batch' as const,
      title: 'Lançamento em Lote',
      description: 'Adicione múltiplas linhas de uma vez, estilo planilha Excel',
      icon: List,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <Card
            key={mode.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
              isSelected && 'border-primary ring-2 ring-primary/20'
            )}
            onClick={() => onSelectMode(mode.id)}
          >
            <CardContent className="flex items-start gap-4 p-6">
              <div className={cn(
                'rounded-lg p-3',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{mode.title}</h3>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
