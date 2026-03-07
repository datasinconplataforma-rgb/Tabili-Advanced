import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, AlertTriangle, Calculator, Link } from 'lucide-react';
import { ColumnType, CustomColumn, CustomTable, FormulaConfig, ListConfig, ReferenceConfig } from '@/hooks/useCustomTables';
import { COLUMN_TYPES } from './CreateTableDialog';
import { FormulaEditor } from './FormulaEditor';
import { ListItemsEditor } from './ListItemsEditor';
import { ReferenceEditor } from './ReferenceEditor';
import { useCustomTables } from '@/hooks/useCustomTables';
import { cn } from '@/lib/utils';

interface EditTableDialogProps {
  table: CustomTable | null;
  isOpen: boolean;
  onClose: () => void;
  onRenameTable: (tableId: string, newName: string) => Promise<boolean>;
  onAddColumn: (tableId: string, column: { name: string; display_name: string; column_type: ColumnType; required?: boolean; formula_config?: FormulaConfig; list_config?: ListConfig; reference_config?: ReferenceConfig }) => Promise<boolean>;
  onUpdateColumn: (columnId: string, updates: { display_name?: string; column_type?: ColumnType; required?: boolean; formula_config?: FormulaConfig; list_config?: ListConfig; reference_config?: ReferenceConfig }) => Promise<boolean>;
  onDeleteColumn: (columnId: string) => Promise<boolean>;
  getColumnDataCount: (tableId: string, columnName: string) => Promise<number>;
}

export function EditTableDialog({
  table,
  isOpen,
  onClose,
  onRenameTable,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  getColumnDataCount,
}: EditTableDialogProps) {
  const { tables } = useCustomTables();
  const [tableName, setTableName] = useState('');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [editedColumnType, setEditedColumnType] = useState<ColumnType>('text');
  const [editedRequired, setEditedRequired] = useState(false);
  const [editedFormulaConfig, setEditedFormulaConfig] = useState<FormulaConfig | null>(null);
  const [editedListConfig, setEditedListConfig] = useState<ListConfig | null>(null);
  const [editedReferenceConfig, setEditedReferenceConfig] = useState<ReferenceConfig | null>(null);
  
  const [newColumn, setNewColumn] = useState({ 
    display_name: '', 
    column_type: 'text' as ColumnType,
    required: false,
    formula_config: null as FormulaConfig | null,
    list_config: null as ListConfig | null,
    reference_config: null as ReferenceConfig | null
  });
  
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ columnId: string; columnName: string; dataCount: number } | null>(null);
  const [checkingData, setCheckingData] = useState(false);
  
  // Visibility states
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [showNewFormulaEditor, setShowNewFormulaEditor] = useState(false);
  const [showListEditor, setShowListEditor] = useState(false);
  const [showNewListEditor, setShowNewListEditor] = useState(false);
  const [showReferenceEditor, setShowReferenceEditor] = useState(false);
  const [showNewReferenceEditor, setShowNewReferenceEditor] = useState(false);

  useEffect(() => {
    if (table) {
      setTableName(table.name);
    }
  }, [table]);

  const handleRenameTable = async () => {
    if (!table || !tableName.trim() || tableName === table.name) return;
    setIsSubmitting(true);
    await onRenameTable(table.id, tableName);
    setIsSubmitting(false);
  };

  const handleStartEditColumn = (column: CustomColumn) => {
    setEditingColumn(column.id);
    setEditedDisplayName(column.display_name);
    setEditedColumnType(column.column_type);
    setEditedRequired(column.required);
    setEditedFormulaConfig(column.formula_config || null);
    setEditedListConfig(column.list_config || null);
    setEditedReferenceConfig(column.reference_config || null);
    
    setShowFormulaEditor(column.column_type === 'formula');
    setShowListEditor(column.column_type === 'list');
    setShowReferenceEditor(column.column_type === 'reference');
  };

  const handleSaveColumnEdit = async (columnId: string) => {
    setIsSubmitting(true);
    await onUpdateColumn(columnId, { 
      display_name: editedDisplayName,
      column_type: editedColumnType,
      required: editedRequired,
      formula_config: editedColumnType === 'formula' ? editedFormulaConfig || undefined : undefined,
      list_config: editedColumnType === 'list' ? editedListConfig || undefined : undefined,
      reference_config: editedColumnType === 'reference' ? editedReferenceConfig || undefined : undefined
    });
    setEditingColumn(null);
    setShowFormulaEditor(false);
    setShowListEditor(false);
    setShowReferenceEditor(false);
    setIsSubmitting(false);
  };

  const handleCancelColumnEdit = () => {
    setEditingColumn(null);
    setEditedDisplayName('');
    setEditedColumnType('text');
    setEditedRequired(false);
    setEditedFormulaConfig(null);
    setEditedListConfig(null);
    setEditedReferenceConfig(null);
    setShowFormulaEditor(false);
    setShowListEditor(false);
    setShowReferenceEditor(false);
  };

  const handleCheckAndDeleteColumn = async (column: CustomColumn) => {
    if (!table) return;
    setCheckingData(true);
    const count = await getColumnDataCount(table.id, column.name);
    setCheckingData(false);
    
    if (count > 0) {
      setDeleteConfirm({ columnId: column.id, columnName: column.display_name, dataCount: count });
    } else {
      await onDeleteColumn(column.id);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    await onDeleteColumn(deleteConfirm.columnId);
    setDeleteConfirm(null);
    setIsSubmitting(false);
  };

  const handleAddColumn = async () => {
    if (!table || !newColumn.display_name.trim()) return;
    
    const name = newColumn.display_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    setIsSubmitting(true);
    const success = await onAddColumn(table.id, {
      name,
      display_name: newColumn.display_name,
      column_type: newColumn.column_type,
      required: newColumn.required,
      formula_config: newColumn.column_type === 'formula' ? newColumn.formula_config || undefined : undefined,
      list_config: newColumn.column_type === 'list' ? newColumn.list_config || undefined : undefined,
      reference_config: newColumn.column_type === 'reference' ? newColumn.reference_config || undefined : undefined
    });
    
    if (success) {
      setNewColumn({ display_name: '', column_type: 'text', required: false, formula_config: null, list_config: null, reference_config: null });
      setIsAddingColumn(false);
      setShowNewFormulaEditor(false);
      setShowNewListEditor(false);
      setShowNewReferenceEditor(false);
    }
    setIsSubmitting(false);
  };

  if (!table) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Tabela</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-2">
            {/* Table Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome da Tabela</Label>
              <div className="flex gap-2">
                <Input
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Nome da tabela"
                  className="border-primary/50 focus-visible:ring-primary"
                />
                <Button 
                  onClick={handleRenameTable}
                  disabled={isSubmitting || !tableName.trim() || tableName === table.name}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Salvar
                </Button>
              </div>
            </div>

            {/* Columns */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Colunas</Label>
                {!isAddingColumn && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddingColumn(true)}
                    className="gap-1 rounded-lg border-primary/20 text-primary hover:text-primary hover:bg-primary/5"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                )}
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {table.columns.map((col) => (
                  <div 
                    key={col.id} 
                    className={cn(
                      "p-4 border rounded-xl transition-colors",
                      editingColumn === col.id 
                        ? "bg-background border-primary ring-1 ring-primary/20" 
                        : "bg-primary/5 border-primary/10 hover:border-primary/30"
                    )}
                  >
                    {editingColumn === col.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedDisplayName}
                            onChange={(e) => setEditedDisplayName(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Select
                            value={editedColumnType}
                            onValueChange={(value) => {
                              setEditedColumnType(value as ColumnType);
                              setShowFormulaEditor(value === 'formula');
                              setShowListEditor(value === 'list');
                              setShowReferenceEditor(value === 'reference');
                            }}
                          >
                            <SelectTrigger className="w-[110px]">
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

                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`edit-required-${col.id}`} 
                            checked={editedRequired}
                            onCheckedChange={(checked) => setEditedRequired(!!checked)}
                          />
                          <label
                            htmlFor={`edit-required-${col.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Obrigatório
                          </label>
                        </div>
                        
                        {showFormulaEditor && (
                          <div className="border rounded-md p-3 bg-background">
                            <FormulaEditor
                              tables={tables}
                              currentTableId={table.id}
                              value={editedFormulaConfig}
                              onChange={setEditedFormulaConfig}
                            />
                          </div>
                        )}
                        
                        {showListEditor && (
                          <div className="border rounded-md p-3 bg-background">
                            <ListItemsEditor
                              value={editedListConfig}
                              onChange={setEditedListConfig}
                            />
                          </div>
                        )}

                        {showReferenceEditor && (
                          <div className="border rounded-md p-3 bg-background">
                            <ReferenceEditor
                              tables={tables}
                              currentTableId={table.id}
                              value={editedReferenceConfig}
                              onChange={setEditedReferenceConfig}
                            />
                          </div>
                        )}
                        
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveColumnEdit(col.id)}
                            disabled={isSubmitting || !editedDisplayName.trim()}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelColumnEdit}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base flex items-center gap-1.5 text-foreground">
                            {col.column_type === 'formula' && <Calculator className="h-3.5 w-3.5 text-primary" />}
                            {col.column_type === 'reference' && <Link className="h-3.5 w-3.5 text-primary" />}
                            {col.display_name}
                            {col.required && <span className="text-destructive text-xs ml-1">*</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {col.name} • {COLUMN_TYPES.find(t => t.value === col.column_type)?.label || 'Texto'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleStartEditColumn(col)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleCheckAndDeleteColumn(col)}
                            disabled={checkingData || table.columns.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add new column form */}
                {isAddingColumn && (
                  <div className="p-4 border rounded-xl border-primary bg-background ring-1 ring-primary/20 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newColumn.display_name}
                        onChange={(e) => setNewColumn({ ...newColumn, display_name: e.target.value })}
                        placeholder="Nome da coluna"
                        className="flex-1"
                        autoFocus
                      />
                      <Select
                        value={newColumn.column_type}
                        onValueChange={(value) => {
                          setNewColumn({ ...newColumn, column_type: value as ColumnType });
                          setShowNewFormulaEditor(value === 'formula');
                          setShowNewListEditor(value === 'list');
                          setShowNewReferenceEditor(value === 'reference');
                        }}
                      >
                        <SelectTrigger className="w-[110px]">
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

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="new-col-required" 
                        checked={newColumn.required}
                        onCheckedChange={(checked) => setNewColumn({ ...newColumn, required: !!checked })}
                      />
                      <label
                        htmlFor="new-col-required"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Obrigatório
                      </label>
                    </div>
                    
                    {showNewFormulaEditor && (
                      <div className="border rounded-md p-3 bg-muted/30">
                        <FormulaEditor
                          tables={tables}
                          currentTableId={table.id}
                          value={newColumn.formula_config}
                          onChange={(config) => setNewColumn({ ...newColumn, formula_config: config })}
                        />
                      </div>
                    )}
                    
                    {showNewListEditor && (
                      <div className="border rounded-md p-3 bg-muted/30">
                        <ListItemsEditor
                          value={newColumn.list_config}
                          onChange={(config) => setNewColumn({ ...newColumn, list_config: config })}
                        />
                      </div>
                    )}

                    {showNewReferenceEditor && (
                      <div className="border rounded-md p-3 bg-muted/30">
                        <ReferenceEditor
                          tables={tables}
                          currentTableId={table.id}
                          value={newColumn.reference_config}
                          onChange={(config) => setNewColumn({ ...newColumn, reference_config: config })}
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddColumn}
                        disabled={isSubmitting || !newColumn.display_name.trim()}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingColumn(false);
                          setNewColumn({ display_name: '', column_type: 'text', required: false, formula_config: null, list_config: null, reference_config: null });
                          setShowNewFormulaEditor(false);
                          setShowNewListEditor(false);
                          setShowNewReferenceEditor(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Coluna com Dados
            </AlertDialogTitle>
            <AlertDialogDescription>
              A coluna <strong>"{deleteConfirm?.columnName}"</strong> possui dados em{' '}
              <strong>{deleteConfirm?.dataCount}</strong> registro(s).
              <br /><br />
              Excluir esta coluna irá remover permanentemente todos os dados associados a ela.
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Coluna e Dados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}