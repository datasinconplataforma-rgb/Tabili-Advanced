import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Send, Loader2, ListChecks, Pencil, Check, X } from 'lucide-react';
import type { ColumnType } from '@/hooks/useCustomTables';

interface Column {
  id: string;
  name: string;
  display_name: string;
  column_type: ColumnType;
}

export interface ReviewEntry {
  tempId: string;
  data: Record<string, string>;
}

interface EntryReviewListProps {
  columns: Column[];
  entries: ReviewEntry[];
  onRemoveEntry: (tempId: string) => void;
  onUpdateEntry: (tempId: string, data: Record<string, string>) => void;
  onSubmitAll: () => void;
  isSubmitting: boolean;
}

export function EntryReviewList({
  columns,
  entries,
  onRemoveEntry,
  onUpdateEntry,
  onSubmitAll,
  isSubmitting,
}: EntryReviewListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ListChecks className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            Preencha o formulário acima para adicionar registros à lista de revisão.
          </p>
        </CardContent>
      </Card>
    );
  }

  const startEditing = (entry: ReviewEntry) => {
    setEditingId(entry.tempId);
    setEditData({ ...entry.data });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEditing = (tempId: string) => {
    onUpdateEntry(tempId, editData);
    setEditingId(null);
    setEditData({});
  };

  const handleInputChange = (colName: string, value: string) => {
    setEditData(prev => ({ ...prev, [colName]: value }));
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Lista de Revisão
            </CardTitle>
            <CardDescription>
              {entries.length} registro(s) pendente(s) de envio. Você pode editar os valores abaixo.
            </CardDescription>
          </div>
          <Button
            onClick={onSubmitAll}
            disabled={isSubmitting || editingId !== null}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {columns.map((col) => (
                  <TableHead key={col.id}>{col.display_name}</TableHead>
                ))}
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={entry.tempId} className={editingId === entry.tempId ? "bg-muted/50" : ""}>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {index + 1}
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      {editingId === entry.tempId && col.column_type !== 'formula' ? (
                        <Input 
                          value={editData[col.name] || ''} 
                          onChange={(e) => handleInputChange(col.name, e.target.value)}
                          className="h-8 min-w-[100px]"
                        />
                      ) : (
                        <span className="truncate block max-w-[200px]">
                          {entry.data[col.name] || '-'}
                        </span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editingId === entry.tempId ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => saveEditing(entry.tempId)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => startEditing(entry)}
                            disabled={isSubmitting}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onRemoveEntry(entry.tempId)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}