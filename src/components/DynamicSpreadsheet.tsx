import { useState, useRef, useCallback, useEffect } from 'react';
import { CustomColumn, CustomDataRow } from '@/hooks/useCustomTables';
import { cn } from '@/lib/utils';
import { formatDisplayValue } from '@/lib/formatters';
import { ExternalLink, Trash2, Plus, Download, ArrowUpDown, Filter, X, Copy, FileText, Send, Upload, Calculator, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { evaluateFormula } from '@/components/FormulaEditor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { useTableSuggestions } from '@/hooks/useAutocompleteSuggestions';

interface DynamicSpreadsheetProps {
  columns: CustomColumn[];
  data: CustomDataRow[];
  onUpdate: (rowId: string, field: string, value: string) => void;
  onDelete: (rowId: string) => void;
  onDeleteMultiple: (rowIds: string[]) => void;
  onAdd: (count?: number) => void;
  onAddWithData?: (data: Record<string, string>) => Promise<void>;
  tableName: string;
  allTablesData?: Record<string, Record<string, string>[]>;
}

type CellSelection = { id: string; field: string };

// Internal component to handle reference options fetching
function ReferenceCellEditor({ 
  value, 
  onChange, 
  targetTableId, 
  targetColumnName 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  targetTableId: string, 
  targetColumnName: string 
}) {
  const { getFieldValues } = useTableSuggestions(targetTableId);
  const options = getFieldValues(targetColumnName);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-full border-0 rounded-none focus:ring-0">
        <SelectValue placeholder="Selecione..." />
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

export function DynamicSpreadsheet({
  columns,
  data,
  onUpdate,
  onDelete,
  onDeleteMultiple,
  onAdd,
  onAddWithData,
  tableName,
  allTablesData,
}: DynamicSpreadsheetProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<CellSelection[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [newRowCount, setNewRowCount] = useState(1);
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null); // Added missing ref

  // Reset form data when columns change
  useEffect(() => {
    const initial: Record<string, string> = {};
    columns.forEach((col) => {
      initial[col.name] = '';
    });
    setFormData(initial);
  }, [columns]);

  // Filter and sort data
  const filteredAndSortedData = data
    .filter((row) => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue) return true;
        const value = row.data[field] || '';
        return value.toLowerCase().includes(filterValue.toLowerCase());
      });
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;
      const aVal = (a.data[sortField] || '').toLowerCase();
      const bVal = (b.data[sortField] || '').toLowerCase();
      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    });

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleCellClick = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      // Don't update if it's a reference column, handled by Select change
      const col = columns.find(c => c.name === editingCell.field);
      if (col?.column_type !== 'reference') {
        onUpdate(editingCell.id, editingCell.field, editValue);
      }
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur();
      if (editingCell) {
        const currentRowIndex = filteredAndSortedData.findIndex((p) => p.id === editingCell.id);
        const currentColIndex = columns.findIndex((c) => c.name === editingCell.field);
        const newRowIndex = Math.min(filteredAndSortedData.length - 1, currentRowIndex + 1);
        const newRow = filteredAndSortedData[newRowIndex];
        setSelectedCells([{ id: newRow.id, field: columns[currentColIndex].name }]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur();
      if (editingCell) {
        const currentRowIndex = filteredAndSortedData.findIndex((p) => p.id === editingCell.id);
        const currentColIndex = columns.findIndex((c) => c.name === editingCell.field);
        const delta = e.shiftKey ? -1 : 1;
        let newColIndex = currentColIndex + delta;
        let newRowIndex = currentRowIndex;
        
        if (newColIndex >= columns.length) {
          newColIndex = 0;
          newRowIndex = Math.min(filteredAndSortedData.length - 1, newRowIndex + 1);
        } else if (newColIndex < 0) {
          newColIndex = columns.length - 1;
          newRowIndex = Math.max(0, newRowIndex - 1);
        }
        
        const newRow = filteredAndSortedData[newRowIndex];
        setSelectedCells([{ id: newRow.id, field: columns[newColIndex].name }]);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Global keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (editingCell || selectedCells.length === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentSelection = selectedCells[selectedCells.length - 1];
      const currentRowIndex = filteredAndSortedData.findIndex((p) => p.id === currentSelection.id);
      const currentColIndex = columns.findIndex((c) => c.name === currentSelection.field);
      
      if (currentRowIndex === -1 || currentColIndex === -1) return;

      let newRowIndex = currentRowIndex;
      let newColIndex = currentColIndex;
      let handled = false;

      switch (e.key) {
        case 'ArrowUp':
          newRowIndex = Math.max(0, currentRowIndex - 1);
          handled = true;
          break;
        case 'ArrowDown':
          newRowIndex = Math.min(filteredAndSortedData.length - 1, currentRowIndex + 1);
          handled = true;
          break;
        case 'ArrowLeft':
          newColIndex = Math.max(0, currentColIndex - 1);
          handled = true;
          break;
        case 'ArrowRight':
          newColIndex = Math.min(columns.length - 1, currentColIndex + 1);
          handled = true;
          break;
        case 'Tab':
          e.preventDefault();
          const delta = e.shiftKey ? -1 : 1;
          newColIndex = currentColIndex + delta;
          if (newColIndex >= columns.length) {
            newColIndex = 0;
            newRowIndex = Math.min(filteredAndSortedData.length - 1, newRowIndex + 1);
          } else if (newColIndex < 0) {
            newColIndex = columns.length - 1;
            newRowIndex = Math.max(0, newRowIndex - 1);
          }
          handled = true;
          break;
        case 'Enter':
          const row = filteredAndSortedData[currentRowIndex];
          const field = columns[currentColIndex].name;
          handleCellClick(row.id, field, row.data[field] || '');
          handled = true;
          break;
        case 'Delete':
        case 'Backspace':
          if (!e.ctrlKey && !e.metaKey) {
            selectedCells.forEach((cell) => {
              onUpdate(cell.id, cell.field, '');
            });
            handled = true;
          }
          break;
      }

      if (handled) {
        e.preventDefault();
        if (e.key !== 'Enter' && e.key !== 'Delete' && e.key !== 'Backspace') {
          const newRow = filteredAndSortedData[newRowIndex];
          const newField = columns[newColIndex].name;
          setSelectedCells([{ id: newRow.id, field: newField }]);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editingCell, selectedCells, filteredAndSortedData, columns, onUpdate]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilter = (field: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === filteredAndSortedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedData.map((p) => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size > 0) {
      onDeleteMultiple(Array.from(selectedRows));
      setSelectedRows(new Set());
    }
  };

  const handleCopy = useCallback(() => {
    if (selectedCells.length > 0) {
      const values = selectedCells.map((cell) => {
        const row = data.find((r) => r.id === cell.id);
        return row ? row.data[cell.field] || '' : '';
      });
      navigator.clipboard.writeText(values.join('\n'));
    } else if (editingCell) {
      const row = data.find((r) => r.id === editingCell.id);
      if (row) {
        const value = row.data[editingCell.field] || '';
        navigator.clipboard.writeText(value);
      }
    }
  }, [selectedCells, editingCell, data]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter((line) => line.trim());
      
      if (selectedCells.length > 0) {
        selectedCells.forEach((cell, index) => {
          const value = lines[index % lines.length]?.trim() || lines[0]?.trim() || '';
          onUpdate(cell.id, cell.field, value);
        });
        setSelectedCells([]);
      } else if (editingCell) {
        onUpdate(editingCell.id, editingCell.field, lines[0]?.trim() || '');
        setEditValue(lines[0]?.trim() || '');
      }
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  }, [selectedCells, editingCell, onUpdate]);

  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        handlePaste();
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleCopy, handlePaste]);

  const exportToCSV = () => {
    const headers = columns.map((c) => c.display_name).join(',');
    const rows = data.map((row) =>
      columns.map((c) => `"${(row.data[c.name] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${tableName}.csv`;
    link.click();
  };

  // Import from Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        toast({ title: 'Erro', description: 'Planilha vazia ou sem dados.', variant: 'destructive' });
        return;
      }
      
      const headers = (jsonData[0] as unknown[]).map((h) => String(h || '').toUpperCase().trim());
      const expectedHeaders = columns.map((c) => c.display_name.toUpperCase());
      
      // Validate headers match exactly
      const headersMatch = expectedHeaders.every((expected, index) => headers[index] === expected);
      
      if (!headersMatch) {
        toast({
          title: 'Erro no cabeçalho',
          description: `Cabeçalho esperado: ${columns.map((c) => c.display_name).join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
      
      // Import data rows
      let importedCount = 0;
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.every((cell) => !cell)) continue;
        
        const rowData: Record<string, string> = {};
        columns.forEach((col, index) => {
          rowData[col.name] = String(row[index] || '');
        });
        
        if (onAddWithData) {
          await onAddWithData(rowData);
          importedCount++;
        }
      }
      
      toast({
        title: 'Importação concluída',
        description: `${importedCount} registro(s) importado(s) com sucesso.`,
      });
    } catch (error) {
      console.error('Excel import error:', error);
      toast({ title: 'Erro', description: 'Falha ao importar arquivo Excel.', variant: 'destructive' });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  const handleCellSelect = (id: string, field: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedCells((prev) => {
        const exists = prev.some((c) => c.id === id && c.field === field);
        if (exists) {
          return prev.filter((c) => !(c.id === id && c.field === field));
        }
        return [...prev, { id, field }];
      });
    } else if (e.shiftKey && selectedCells.length > 0) {
      const lastCell = selectedCells[selectedCells.length - 1];
      const startRowIndex = filteredAndSortedData.findIndex((p) => p.id === lastCell.id);
      const endRowIndex = filteredAndSortedData.findIndex((p) => p.id === id);
      const startColIndex = columns.findIndex((c) => c.name === lastCell.field);
      const endColIndex = columns.findIndex((c) => c.name === field);

      const minRow = Math.min(startRowIndex, endRowIndex);
      const maxRow = Math.max(startRowIndex, endRowIndex);
      const minCol = Math.min(startColIndex, endColIndex);
      const maxCol = Math.max(startColIndex, endColIndex);

      const newSelection: CellSelection[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.push({
            id: filteredAndSortedData[r].id,
            field: columns[c].name,
          });
        }
      }
      setSelectedCells(newSelection);
    } else {
      setSelectedCells([{ id, field }]);
    }
  };

  const handleAutoFill = () => {
    if (selectedCells.length > 1) {
      const firstCell = selectedCells[0];
      const row = data.find((r) => r.id === firstCell.id);
      if (row) {
        const value = row.data[firstCell.field] || '';
        selectedCells.slice(1).forEach((cell) => {
          onUpdate(cell.id, cell.field, value);
        });
      }
    }
  };

  const isCellSelected = (id: string, field: string) => {
    return selectedCells.some((c) => c.id === id && c.field === field);
  };

  const handleAddRows = () => {
    onAdd(newRowCount);
    setNewRowCount(1);
    setIsAddPopoverOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddWithData) {
      await onAddWithData(formData);
      const reset: Record<string, string> = {};
      columns.forEach((col) => {
        reset[col.name] = '';
      });
      setFormData(reset);
      setIsFormDialogOpen(false);
    }
  };

  const isLinkColumn = (colName: string) => {
    return colName.toLowerCase() === 'link' || colName.toLowerCase() === 'url';
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nova Linha
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Quantidade de linhas</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newRowCount}
                onChange={(e) => setNewRowCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8"
              />
              <Button onClick={handleAddRows} size="sm" className="w-full">
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Send className="h-4 w-4" />
              Enviar Dados
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Registro - {tableName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {columns.map((col) => (
                <div key={col.id} className="space-y-2">
                  <Label htmlFor={col.name}>{col.display_name}</Label>
                  <Input
                    id={col.name}
                    value={formData[col.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                    placeholder={isLinkColumn(col.name) ? 'https://...' : ''}
                  />
                </div>
              ))}
              <Button type="submit" className="w-full">
                Adicionar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-1">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleExcelImport}
          className="hidden"
        />
        <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="gap-1">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
        {selectedCells.length > 1 && (
          <Button onClick={handleAutoFill} variant="outline" size="sm" className="gap-1">
            <Copy className="h-4 w-4" />
            Preencher ({selectedCells.length})
          </Button>
        )}
        {selectedRows.size > 0 && (
          <Button onClick={handleDeleteSelected} variant="destructive" size="sm" className="gap-1">
            <Trash2 className="h-4 w-4" />
            Excluir ({selectedRows.size})
          </Button>
        )}
        {hasActiveFilters && (
          <Button onClick={() => setFilters({})} variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 p-2 border-r">
                  <input
                    type="checkbox"
                    checked={filteredAndSortedData.length > 0 && selectedRows.size === filteredAndSortedData.length}
                    onChange={toggleAllSelection}
                    className="rounded border-border"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.id} className="p-0 border-r last:border-r-0 min-w-[150px]">
                    <div className="flex items-center justify-between p-2 border-b">
                      <span className="font-medium text-foreground">{col.display_name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSort(col.name)}
                          className={cn('p-1 rounded hover:bg-muted transition-colors', sortField === col.name && 'bg-muted')}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn('p-1 rounded hover:bg-muted transition-colors', filters[col.name] && 'bg-primary/10 text-primary')}
                            >
                              <Filter className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <div className="p-2">
                              <Input
                                placeholder={`Filtrar ${col.display_name.toLowerCase()}...`}
                                value={filters[col.name] || ''}
                                onChange={(e) => handleFilterChange(col.name, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            {filters[col.name] && (
                              <DropdownMenuItem onClick={() => clearFilter(col.name)}>
                                Limpar filtro
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="w-10 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((row) => (
                <tr
                  key={row.id}
                  className={cn('border-b last:border-b-0 transition-colors', selectedRows.has(row.id) && 'bg-primary/5')}
                >
                  <td className="p-2 border-r text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => toggleRowSelection(row.id)}
                      className="rounded border-border"
                    />
                  </td>
                  {columns.map((col) => {
                    const isSelected = isCellSelected(row.id, col.name);
                    const isEditing = editingCell?.id === row.id && editingCell?.field === col.name;
                    const isFormulaColumn = col.column_type === 'formula';
                    const isReferenceColumn = col.column_type === 'reference' && col.reference_config;
                    const isListColumn = col.column_type === 'list' && col.list_config?.items;

                    return (
                      <td
                        key={col.id}
                        className={cn(
                          "p-0 border-r last:border-r-0",
                          isCellSelected(row.id, col.name) && 'bg-primary/20 ring-2 ring-primary ring-inset'
                        )}
                        onClick={(e) => {
                          if (!editingCell) {
                            handleCellSelect(row.id, col.name, e);
                          }
                        }}
                        onDoubleClick={() => !isFormulaColumn && !isListColumn && !isReferenceColumn && handleCellClick(row.id, col.name, row.data[col.name] || '')}
                      >
                        {isReferenceColumn && col.reference_config ? (
                          <div className="h-8">
                            <ReferenceCellEditor
                              value={row.data[col.name] || ''}
                              onChange={(val) => onUpdate(row.id, col.name, val)}
                              targetTableId={col.reference_config.targetTableId}
                              targetColumnName={col.reference_config.targetColumnName}
                            />
                          </div>
                        ) : isListColumn ? (
                          <Select
                            value={row.data[col.name] || ''}
                            onValueChange={(val) => onUpdate(row.id, col.name, val)}
                          >
                            <SelectTrigger className="h-8 border-0 shadow-none focus:ring-0">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {col.list_config!.items.map((item) => (
                                <SelectItem key={item} value={item}>
                                  {item}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : isEditing ? (
                          <Input
                            ref={inputRef}
                            type={col.column_type === 'date' ? 'date' : col.column_type === 'time' ? 'time' : col.column_type === 'number' ? 'number' : col.column_type === 'currency' ? 'number' : col.column_type === 'email' ? 'email' : col.column_type === 'url' ? 'url' : 'text'}
                            step={col.column_type === 'currency' ? '0.01' : col.column_type === 'number' ? 'any' : undefined}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            className="h-full border-0 rounded-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                          />
                        ) : (
                          <div className="p-2 min-h-[40px] cursor-cell hover:bg-muted/50 transition-colors">
                            {col.column_type === 'formula' && col.formula_config ? (
                              <span className="flex items-center gap-1 text-primary font-medium">
                                <Calculator className="h-3 w-3" />
                                {(() => {
                                  try {
                                    const result = evaluateFormula(col.formula_config, row.data, allTablesData);
                                    if (result !== null && result !== undefined) {
                                      if (typeof result === 'number') {
                                        return new Intl.NumberFormat('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        }).format(result);
                                      }
                                      return String(result);
                                    }
                                    return '-';
                                  } catch (error) {
                                    console.error('Formula evaluation error:', error);
                                    return '-';
                                  }
                                })()}
                              </span>
                            ) : isLinkColumn(col.name) && row.data[col.name] ? (
                              <a
                                href={row.data[col.name].startsWith('http') ? row.data[col.name] : `https://${row.data[col.name]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {row.data[col.name]}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className={cn(!row.data[col.name] && 'text-muted-foreground/50')}>
                                {formatDisplayValue(row.data[col.name], col.column_type)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredAndSortedData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="p-8 text-center text-muted-foreground">
                    {hasActiveFilters
                      ? 'Nenhum resultado encontrado para os filtros aplicados.'
                      : 'Nenhum dado cadastrado. Clique em "Nova Linha" ou "Enviar Dados" para começar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-2 text-xs text-muted-foreground">
        {filteredAndSortedData.length} de {data.length} linhas
        {selectedRows.size > 0 && ` • ${selectedRows.size} linhas selecionadas`}
        {selectedCells.length > 0 && ` • ${selectedCells.length} células selecionadas`}
        {' • Setas/Tab para navegar • Enter para editar • Ctrl+C/V copiar/colar • Delete para limpar'}
      </div>
    </div>
  );
}