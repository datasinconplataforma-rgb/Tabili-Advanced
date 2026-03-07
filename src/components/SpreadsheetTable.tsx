import { useState, useRef, useCallback, useEffect } from 'react';
import { Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { ExternalLink, Trash2, Plus, Download, ArrowUpDown, Filter, X, Copy, Send, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface SpreadsheetTableProps {
  projects: Project[];
  onUpdate: (id: string, field: keyof Project, value: string) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onAdd: (count?: number) => void;
  onAddWithData?: (data: Omit<Project, 'id'>) => Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type SortField = keyof Omit<Project, 'id'>;
type SortDirection = 'asc' | 'desc' | null;
type CellSelection = { id: string; field: SortField };

const COLUMNS: { key: SortField; label: string }[] = [
  { key: 'plataforma', label: 'PLATAFORMA' },
  { key: 'conta', label: 'CONTA' },
  { key: 'workspace', label: 'WORKSPACE' },
  { key: 'projeto', label: 'PROJETO' },
  { key: 'link', label: 'LINK' },
];

export function SpreadsheetTable({
  projects,
  onUpdate,
  onDelete,
  onDeleteMultiple,
  onAdd,
  onAddWithData,
  onRefresh,
  isRefreshing,
}: SpreadsheetTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<CellSelection[]>([]);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Partial<Record<SortField, string>>>({});
  const [newRowCount, setNewRowCount] = useState(1);
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    plataforma: '',
    conta: '',
    workspace: '',
    projeto: '',
    link: '',
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Filter and sort projects (moved up for navigation functions)
  const filteredAndSortedProjects = projects
    .filter((project) => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue) return true;
        const value = project[field as SortField] || '';
        return value.toLowerCase().includes(filterValue.toLowerCase());
      });
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      if (sortDirection === 'asc') {
        return aVal.localeCompare(bVal);
      }
      return bVal.localeCompare(aVal);
    });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddWithData) {
      await onAddWithData(formData);
      setFormData({ plataforma: '', conta: '', workspace: '', projeto: '', link: '' });
      setIsFormDialogOpen(false);
    }
  };

  // Focus input when editing starts
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
      onUpdate(editingCell.id, editingCell.field as keyof Project, editValue);
      setEditingCell(null);
    }
  };

  // Navigate to adjacent cell
  const navigateToCell = useCallback((rowDelta: number, colDelta: number) => {
    const currentSelection = selectedCells.length > 0 ? selectedCells[selectedCells.length - 1] : null;
    if (!currentSelection) return;

    const currentRowIndex = filteredAndSortedProjects.findIndex((p) => p.id === currentSelection.id);
    const currentColIndex = COLUMNS.findIndex((c) => c.key === currentSelection.field);
    
    if (currentRowIndex === -1 || currentColIndex === -1) return;

    const newRowIndex = Math.max(0, Math.min(filteredAndSortedProjects.length - 1, currentRowIndex + rowDelta));
    const newColIndex = Math.max(0, Math.min(COLUMNS.length - 1, currentColIndex + colDelta));

    const newProject = filteredAndSortedProjects[newRowIndex];
    const newField = COLUMNS[newColIndex].key;

    setSelectedCells([{ id: newProject.id, field: newField }]);
  }, [selectedCells, filteredAndSortedProjects]);

  // Handle keyboard navigation when editing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur();
      // Move down after Enter
      if (editingCell) {
        const currentRowIndex = filteredAndSortedProjects.findIndex((p) => p.id === editingCell.id);
        const currentColIndex = COLUMNS.findIndex((c) => c.key === editingCell.field);
        const newRowIndex = Math.min(filteredAndSortedProjects.length - 1, currentRowIndex + 1);
        const newProject = filteredAndSortedProjects[newRowIndex];
        setSelectedCells([{ id: newProject.id, field: COLUMNS[currentColIndex].key }]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur();
      // Move right (or left with Shift) after Tab
      if (editingCell) {
        const currentRowIndex = filteredAndSortedProjects.findIndex((p) => p.id === editingCell.id);
        const currentColIndex = COLUMNS.findIndex((c) => c.key === editingCell.field);
        const delta = e.shiftKey ? -1 : 1;
        let newColIndex = currentColIndex + delta;
        let newRowIndex = currentRowIndex;
        
        // Wrap to next/previous row
        if (newColIndex >= COLUMNS.length) {
          newColIndex = 0;
          newRowIndex = Math.min(filteredAndSortedProjects.length - 1, newRowIndex + 1);
        } else if (newColIndex < 0) {
          newColIndex = COLUMNS.length - 1;
          newRowIndex = Math.max(0, newRowIndex - 1);
        }
        
        const newProject = filteredAndSortedProjects[newRowIndex];
        setSelectedCells([{ id: newProject.id, field: COLUMNS[newColIndex].key }]);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Global keyboard navigation for selected cells
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Skip if we're editing or no cells selected
      if (editingCell || selectedCells.length === 0) return;
      
      // Skip if typing in input elements
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentSelection = selectedCells[selectedCells.length - 1];
      const currentRowIndex = filteredAndSortedProjects.findIndex((p) => p.id === currentSelection.id);
      const currentColIndex = COLUMNS.findIndex((c) => c.key === currentSelection.field);
      
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
          newRowIndex = Math.min(filteredAndSortedProjects.length - 1, currentRowIndex + 1);
          handled = true;
          break;
        case 'ArrowLeft':
          newColIndex = Math.max(0, currentColIndex - 1);
          handled = true;
          break;
        case 'ArrowRight':
          newColIndex = Math.min(COLUMNS.length - 1, currentColIndex + 1);
          handled = true;
          break;
        case 'Tab':
          e.preventDefault();
          const delta = e.shiftKey ? -1 : 1;
          newColIndex = currentColIndex + delta;
          if (newColIndex >= COLUMNS.length) {
            newColIndex = 0;
            newRowIndex = Math.min(filteredAndSortedProjects.length - 1, newRowIndex + 1);
          } else if (newColIndex < 0) {
            newColIndex = COLUMNS.length - 1;
            newRowIndex = Math.max(0, newRowIndex - 1);
          }
          handled = true;
          break;
        case 'Enter':
          // Start editing selected cell
          const project = filteredAndSortedProjects[currentRowIndex];
          const field = COLUMNS[currentColIndex].key;
          handleCellClick(project.id, field, project[field] || '');
          handled = true;
          break;
        case 'Delete':
        case 'Backspace':
          // Clear selected cells
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
          const newProject = filteredAndSortedProjects[newRowIndex];
          const newField = COLUMNS[newColIndex].key;
          setSelectedCells([{ id: newProject.id, field: newField }]);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [editingCell, selectedCells, filteredAndSortedProjects, onUpdate]);

  const handleSort = (field: SortField) => {
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

  const handleFilterChange = (field: SortField, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilter = (field: SortField) => {
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
    if (selectedRows.size === filteredAndSortedProjects.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredAndSortedProjects.map((p) => p.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRows.size > 0) {
      onDeleteMultiple(Array.from(selectedRows));
      setSelectedRows(new Set());
    }
  };

  // Copy handler - copy selected cells or current cell
  const handleCopy = useCallback(() => {
    if (selectedCells.length > 0) {
      const values = selectedCells.map((cell) => {
        const project = projects.find((p) => p.id === cell.id);
        return project ? project[cell.field] || '' : '';
      });
      navigator.clipboard.writeText(values.join('\n'));
    } else if (editingCell) {
      const project = projects.find((p) => p.id === editingCell.id);
      if (project) {
        const value = project[editingCell.field as keyof Project] || '';
        navigator.clipboard.writeText(value);
      }
    }
  }, [selectedCells, editingCell, projects]);

  // Paste handler - paste into selected cells or range
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter((line) => line.trim());
      
      if (selectedCells.length > 0) {
        // Paste into selected cells
        selectedCells.forEach((cell, index) => {
          const value = lines[index % lines.length]?.trim() || lines[0]?.trim() || '';
          onUpdate(cell.id, cell.field, value);
        });
        setSelectedCells([]);
      } else if (editingCell) {
        // Paste into single editing cell
        onUpdate(editingCell.id, editingCell.field as keyof Project, lines[0]?.trim() || '');
        setEditValue(lines[0]?.trim() || '');
      }
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  }, [selectedCells, editingCell, onUpdate]);

  // Keyboard shortcuts
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

  // Export to CSV
  const exportToCSV = () => {
    const headers = COLUMNS.map((c) => c.label).join(',');
    const rows = projects.map((p) =>
      COLUMNS.map((c) => `"${(p[c.key] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'projetos.csv';
    link.click();
  };

  // Import from Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        toast({ title: 'Erro', description: 'Planilha vazia ou sem dados.', variant: 'destructive' });
        return;
      }
      
      const headers = (jsonData[0] as unknown[]).map((h) => String(h || '').toUpperCase().trim());
      const expectedHeaders = COLUMNS.map((c) => c.label);
      
      // Validate headers match exactly
      const headersMatch = expectedHeaders.every((expected, index) => headers[index] === expected);
      
      if (!headersMatch) {
        toast({
          title: 'Erro no cabeçalho',
          description: `Cabeçalho esperado: ${expectedHeaders.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
      
      // Import data rows
      let importedCount = 0;
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.every((cell) => !cell)) continue;
        
        const rowData: Omit<Project, 'id'> = {
          plataforma: String(row[0] || ''),
          conta: String(row[1] || ''),
          workspace: String(row[2] || ''),
          projeto: String(row[3] || ''),
          link: String(row[4] || ''),
        };
        
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

  // Cell selection with Ctrl/Cmd click
  const handleCellSelect = (id: string, field: SortField, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle cell selection
      setSelectedCells((prev) => {
        const exists = prev.some((c) => c.id === id && c.field === field);
        if (exists) {
          return prev.filter((c) => !(c.id === id && c.field === field));
        }
        return [...prev, { id, field }];
      });
    } else if (e.shiftKey && selectedCells.length > 0) {
      // Range selection
      const lastCell = selectedCells[selectedCells.length - 1];
      const startRowIndex = filteredAndSortedProjects.findIndex((p) => p.id === lastCell.id);
      const endRowIndex = filteredAndSortedProjects.findIndex((p) => p.id === id);
      const startColIndex = COLUMNS.findIndex((c) => c.key === lastCell.field);
      const endColIndex = COLUMNS.findIndex((c) => c.key === field);

      const minRow = Math.min(startRowIndex, endRowIndex);
      const maxRow = Math.max(startRowIndex, endRowIndex);
      const minCol = Math.min(startColIndex, endColIndex);
      const maxCol = Math.max(startColIndex, endColIndex);

      const newSelection: CellSelection[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.push({
            id: filteredAndSortedProjects[r].id,
            field: COLUMNS[c].key,
          });
        }
      }
      setSelectedCells(newSelection);
    } else {
      // Single cell selection (clear previous)
      setSelectedCells([{ id, field }]);
    }
  };

  // Auto-fill: fill selected cells with first cell's value
  const handleAutoFill = () => {
    if (selectedCells.length > 1) {
      const firstCell = selectedCells[0];
      const project = projects.find((p) => p.id === firstCell.id);
      if (project) {
        const value = project[firstCell.field] || '';
        selectedCells.slice(1).forEach((cell) => {
          onUpdate(cell.id, cell.field, value);
        });
      }
    }
  };

  const isCellSelected = (id: string, field: SortField) => {
    return selectedCells.some((c) => c.id === id && c.field === field);
  };

  const handleAddRows = () => {
    onAdd(newRowCount);
    setNewRowCount(1);
    setIsAddPopoverOpen(false);
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
              <DialogTitle>Novo Projeto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plataforma">Plataforma</Label>
                <Input
                  id="plataforma"
                  value={formData.plataforma}
                  onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conta">Conta</Label>
                <Input
                  id="conta"
                  value={formData.conta}
                  onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace</Label>
                <Input
                  id="workspace"
                  value={formData.workspace}
                  onChange={(e) => setFormData({ ...formData, workspace: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projeto">Projeto</Label>
                <Input
                  id="projeto"
                  value={formData.projeto}
                  onChange={(e) => setFormData({ ...formData, projeto: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link">Link</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" className="w-full">
                Adicionar Projeto
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
          <Button
            onClick={handleDeleteSelected}
            variant="destructive"
            size="sm"
            className="gap-1"
          >
            <Trash2 className="h-4 w-4" />
            Excluir ({selectedRows.size})
          </Button>
        )}
        {hasActiveFilters && (
          <Button
            onClick={() => setFilters({})}
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 p-2 border-r">
                  <input
                    type="checkbox"
                    checked={
                      filteredAndSortedProjects.length > 0 &&
                      selectedRows.size === filteredAndSortedProjects.length
                    }
                    onChange={toggleAllSelection}
                    className="rounded border-border"
                  />
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="p-0 border-r last:border-r-0 min-w-[150px]"
                  >
                    <div className="flex items-center justify-between p-2 border-b">
                      <span className="font-medium text-foreground">{col.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            'p-1 rounded hover:bg-muted transition-colors',
                            sortField === col.key && 'bg-muted'
                          )}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                'p-1 rounded hover:bg-muted transition-colors',
                                filters[col.key] && 'bg-primary/10 text-primary'
                              )}
                            >
                              <Filter className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <div className="p-2">
                              <Input
                                placeholder={`Filtrar ${col.label.toLowerCase()}...`}
                                value={filters[col.key] || ''}
                                onChange={(e) => handleFilterChange(col.key, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            {filters[col.key] && (
                              <DropdownMenuItem onClick={() => clearFilter(col.key)}>
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
              {filteredAndSortedProjects.map((project) => (
                <tr
                  key={project.id}
                  className={cn(
                    'border-b last:border-b-0 transition-colors',
                    selectedRows.has(project.id) && 'bg-primary/5'
                  )}
                >
                  <td className="p-2 border-r text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(project.id)}
                      onChange={() => toggleRowSelection(project.id)}
                      className="rounded border-border"
                    />
                  </td>
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "p-0 border-r last:border-r-0",
                        isCellSelected(project.id, col.key) && 'bg-primary/20 ring-2 ring-primary ring-inset'
                      )}
                      onClick={(e) => {
                        if (!editingCell) {
                          handleCellSelect(project.id, col.key, e);
                        }
                      }}
                      onDoubleClick={() => handleCellClick(project.id, col.key, project[col.key] || '')}
                    >
                      {editingCell?.id === project.id && editingCell?.field === col.key ? (
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={handleKeyDown}
                          className="h-full border-0 rounded-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                        />
                      ) : (
                        <div className="p-2 min-h-[40px] cursor-cell hover:bg-muted/50 transition-colors">
                          {col.key === 'link' && project.link ? (
                            <a
                              href={project.link.startsWith('http') ? project.link : `https://${project.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {project.link}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className={cn(!project[col.key] && 'text-muted-foreground/50')}>
                              {project[col.key] || ''}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredAndSortedProjects.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="p-8 text-center text-muted-foreground">
                    {hasActiveFilters
                      ? 'Nenhum resultado encontrado para os filtros aplicados.'
                      : 'Nenhum projeto cadastrado. Clique em "Nova Linha" para começar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-2 text-xs text-muted-foreground">
        {filteredAndSortedProjects.length} de {projects.length} linhas
        {selectedRows.size > 0 && ` • ${selectedRows.size} linhas selecionadas`}
        {selectedCells.length > 0 && ` • ${selectedCells.length} células selecionadas`}
        {' • Setas/Tab para navegar • Enter para editar • Ctrl+C/V copiar/colar • Delete para limpar'}
      </div>
    </div>
  );
}
