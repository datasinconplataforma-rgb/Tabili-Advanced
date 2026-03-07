import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCustomTables, useCustomTableData } from '@/hooks/useCustomTables';
import { useAllTablesData } from '@/hooks/useAllTablesData';
import { ProjectFilter } from '@/components/ProjectFilter';
import { useTableSuggestions } from '@/hooks/useAutocompleteSuggestions';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Search, FileText, FileSpreadsheet, X, Database, Filter, Pencil, Trash2, Save, XCircle, Plus, Columns, Eye, EyeOff, ArrowLeft, Share2, PencilLine, Globe } from 'lucide-react';
import { PublicViewDialog } from '@/components/PublicViewDialog';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import type { ColumnType, CustomColumn } from '@/hooks/useCustomTables';
import { evaluateFormula } from '@/components/FormulaEditor';
import { formatDisplayValue, formatCurrency } from '@/lib/formatters';

const menuItems: ModuleMenuItem[] = [
  { id: "consulta", label: "Consulta Geral", icon: Search, href: "/consulta" },
];

interface ColumnFilter {
  column: string;
  operator: 'contains' | 'equals' | 'starts' | 'ends' | 'greater' | 'less';
  value: string;
}

const formatCellValue = (
  value: string | undefined, 
  columnType: ColumnType, 
  column?: CustomColumn,
  rowData?: Record<string, string>
): string => {
  if (columnType === 'formula' && column?.formula_config && rowData) {
    const result = evaluateFormula(column.formula_config, rowData, allTablesData);
    if (result !== null) {
      if (typeof result === 'number') {
        return formatCurrency(result);
      }
      return String(result);
    }
    return '-';
  }
  
  if (!value) return '-';
  const formatted = formatDisplayValue(value, columnType);
  return formatted || '-';
};

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

export default function ConsultaGeral() {
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const { tables, loading: tablesLoading } = useCustomTables();
  const { allTablesData } = useAllTablesData();
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [tableSearchFilter, setTableSearchFilter] = useState('');

  // Pre-select table from navigation state
  useEffect(() => {
    const state = location.state as { selectedTableId?: string } | null;
    if (state?.selectedTableId && tables.length > 0) {
      const exists = tables.find(t => t.id === state.selectedTableId);
      if (exists) {
        handleTableChange(state.selectedTableId);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, tables]);
  
  const [projectFilter, setProjectFilter] = useState('__all__');
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [searchGlobal, setSearchGlobal] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [newEntryData, setNewEntryData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [publicViewDialogOpen, setPublicViewDialogOpen] = useState(false);

  const { data: tableRecordCounts } = useQuery({
    queryKey: ['table-record-counts', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await supabase.from('custom_data').select('table_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(row => { counts[row.table_id] = (counts[row.table_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user,
  });

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const { data: customData, loading: customDataLoading, updateRow, deleteRow, deleteMultipleRows, addRowWithData, refetch } = useCustomTableData(selectedTableId || null, selectedTable?.name);
  const { getSuggestions } = useTableSuggestions(selectedTableId || null);

  const { ownedTables, sharedTables } = useMemo(() => {
    const tablesWithData = tables.filter(table => tableRecordCounts && tableRecordCounts[table.id] && tableRecordCounts[table.id] > 0);
    const projectFiltered = projectFilter === '__all__' ? tablesWithData : projectFilter === '__none__' ? tablesWithData.filter(t => !t.project_id) : tablesWithData.filter(t => t.project_id === projectFilter);
    const sorted = [...projectFiltered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    const filtered = tableSearchFilter.trim() ? sorted.filter(table => table.name.toLowerCase().includes(tableSearchFilter.toLowerCase())) : sorted;
    return { ownedTables: filtered.filter(t => t.is_owner), sharedTables: filtered.filter(t => !t.is_owner) };
  }, [tables, tableSearchFilter, tableRecordCounts, projectFilter]);

  const allFilteredTables = [...ownedTables, ...sharedTables];

  const addFilter = () => { if (selectedTable && selectedTable.columns.length > 0) setFilters([...filters, { column: selectedTable.columns[0].name, operator: 'contains', value: '' }]); };
  const updateFilter = (index: number, field: keyof ColumnFilter, value: string) => { const newFilters = [...filters]; newFilters[index] = { ...newFilters[index], [field]: value }; setFilters(newFilters); };
  const removeFilter = (index: number) => { setFilters(filters.filter((_, i) => i !== index)); };
  const clearFilters = () => { setFilters([]); setSearchGlobal(''); };

  const filteredData = useMemo(() => {
    if (!customData.length) return [];
    return customData.filter((row) => {
      if (searchGlobal) {
        const searchLower = searchGlobal.toLowerCase();
        const matchesGlobal = Object.values(row.data).some((val) => String(val || '').toLowerCase().includes(searchLower));
        if (!matchesGlobal) return false;
      }
      for (const filter of filters) {
        const cellValue = String(row.data[filter.column] || '').toLowerCase();
        const filterValue = filter.value.toLowerCase();
        if (!filterValue) continue;
        switch (filter.operator) {
          case 'contains': if (!cellValue.includes(filterValue)) return false; break;
          case 'equals': if (cellValue !== filterValue) return false; break;
          case 'starts': if (!cellValue.startsWith(filterValue)) return false; break;
          case 'ends': if (!cellValue.endsWith(filterValue)) return false; break;
          case 'greater': if (parseFloat(cellValue) <= parseFloat(filterValue)) return false; break;
          case 'less': if (parseFloat(cellValue) >= parseFloat(filterValue)) return false; break;
        }
      }
      return true;
    });
  }, [customData, filters, searchGlobal]);

  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    setTableSearchFilter('');
    setFilters([]);
    setSearchGlobal('');
    setSelectedRows(new Set());
    setEditingRowId(null);
    setNewEntryData({});
    const table = tables.find(t => t.id === tableId);
    if (table) setVisibleColumns(new Set(table.columns.map(c => c.name)));
  };

  const handleBackToTableSelection = () => { setSelectedTableId(''); setTableSearchFilter(''); setFilters([]); setSearchGlobal(''); setSelectedRows(new Set()); setEditingRowId(null); };

  const displayedColumns = useMemo(() => {
    if (!selectedTable) return [];
    if (visibleColumns.size === 0) return selectedTable.columns;
    return selectedTable.columns.filter(col => visibleColumns.has(col.name));
  }, [selectedTable, visibleColumns]);

  const toggleColumnVisibility = (columnName: string) => { setVisibleColumns(prev => { const newSet = new Set(prev); if (newSet.size === 0 && selectedTable) selectedTable.columns.forEach(c => newSet.add(c.name)); if (newSet.has(columnName)) { if (newSet.size > 1) newSet.delete(columnName); } else { newSet.add(columnName); } return newSet; }); };
  const showAllColumns = () => { if (selectedTable) setVisibleColumns(new Set(selectedTable.columns.map(c => c.name))); };
  const isColumnVisible = (columnName: string) => { if (visibleColumns.size === 0) return true; return visibleColumns.has(columnName); };

  const openEntryDialog = () => { if (!selectedTable) return; const initial: Record<string, string> = {}; selectedTable.columns.forEach((col) => { initial[col.name] = ''; }); setNewEntryData(initial); setEntryDialogOpen(true); };
  const handleNewEntryChange = (columnName: string, value: string) => { setNewEntryData((prev) => ({ ...prev, [columnName]: value })); };
  const handleNewEntryPaste = (e: React.ClipboardEvent<HTMLInputElement>, startColumnIndex: number) => { const pastedData = e.clipboardData.getData('text'); if (pastedData.includes('\t') && selectedTable) { e.preventDefault(); const values = pastedData.split('\t').map(v => v.replace(/\r?\n/g, '').trim()); const updates: Record<string, string> = {}; values.forEach((value, i) => { const colIndex = startColumnIndex + i; if (colIndex < selectedTable.columns.length) updates[selectedTable.columns[colIndex].name] = value; }); setNewEntryData((prev) => ({ ...prev, ...updates })); } };
  const handleSubmitNewEntry = async () => { const hasData = Object.values(newEntryData).some((v) => v.trim()); if (!hasData) return; setIsSubmitting(true); try { await addRowWithData(newEntryData); toast({ title: 'Registro adicionado com sucesso!' }); setEntryDialogOpen(false); setNewEntryData({}); refetch(); } catch (error) { toast({ title: 'Erro ao adicionar registro', variant: 'destructive' }); } finally { setIsSubmitting(false); } };
  const isNewEntryEmpty = Object.values(newEntryData).every((v) => !v.trim());

  const toggleRowSelection = (rowId: string) => { const newSelected = new Set(selectedRows); if (newSelected.has(rowId)) newSelected.delete(rowId); else newSelected.add(rowId); setSelectedRows(newSelected); };
  const toggleAllSelection = () => { if (selectedRows.size === filteredData.length) setSelectedRows(new Set()); else setSelectedRows(new Set(filteredData.map((r) => r.id))); };

  const startEditing = (row: typeof filteredData[0]) => { setEditingRowId(row.id); setEditingData({ ...row.data }); };
  const cancelEditing = () => { setEditingRowId(null); setEditingData({}); };
  const saveEditing = async () => { if (!editingRowId) return; const originalRow = customData.find((r) => r.id === editingRowId); if (!originalRow) return; for (const [field, value] of Object.entries(editingData)) { if (originalRow.data[field] !== value) await updateRow(editingRowId, field, value); } setEditingRowId(null); setEditingData({}); refetch(); };

  const confirmDeleteRow = (rowId: string) => { setRowToDelete(rowId); setDeleteDialogOpen(true); };
  const handleDeleteRow = async () => { if (rowToDelete) { await deleteRow(rowToDelete); setRowToDelete(null); setDeleteDialogOpen(false); } };

  const handleBulkDelete = async () => {
    if (selectedRows.size > 0) {
      setIsDeletingBulk(true);
      try {
        await deleteMultipleRows(Array.from(selectedRows));
        setSelectedRows(new Set());
        setBulkDeleteDialogOpen(false);
      } finally {
        setIsDeletingBulk(false);
      }
    }
  };

  const exportToPDF = () => { if (!selectedTable || !filteredData.length) return; const doc = new jsPDF('l', 'mm', 'a4'); doc.setFontSize(16); doc.text(`Consulta: ${selectedTable.name}`, 14, 15); doc.setFontSize(10); doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22); doc.text(`Total de registros: ${filteredData.length}`, 14, 28); const headers = displayedColumns.map((c) => c.display_name); const body = filteredData.map((row) => displayedColumns.map((c) => formatCellValue(row.data[c.name], c.column_type, c, row.data))); autoTable(doc, { head: [headers], body: body, startY: 35, theme: 'striped', headStyles: { fillColor: [66, 66, 66] }, styles: { fontSize: 8 }, }); doc.save(`${selectedTable.name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`); };
  const exportToExcel = () => { if (!selectedTable || !filteredData.length) return; const headers = displayedColumns.map((c) => c.display_name); const rows = filteredData.map((row) => displayedColumns.reduce((acc, c) => { acc[c.display_name] = formatCellValue(row.data[c.name], c.column_type, c, row.data); return acc; }, {} as Record<string, string>)); const ws = XLSX.utils.json_to_sheet(rows, { header: headers }); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, selectedTable.name); XLSX.writeFile(wb, `${selectedTable.name}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`); };

  return (
    <ModuleSidebarLayout
      moduleName="Consulta"
      moduleIcon={Search}
      menuItems={menuItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consulta Geral</h1>
          <p className="text-muted-foreground">Consulte e exporte dados das suas tabelas</p>
        </div>

        {!selectedTableId ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar tabelas..."
                  value={tableSearchFilter}
                  onChange={(e) => setTableSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {tablesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allFilteredTables.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {tableSearchFilter 
                      ? 'Nenhuma tabela encontrada com o filtro atual.' 
                      : 'Nenhuma tabela com dados disponÃ­vel. Adicione registros em uma tabela para consultÃ¡-la aqui.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {ownedTables.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Minhas Tabelas ({ownedTables.length})
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {ownedTables.map((table) => (
                        <Card key={table.id} className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/50" onClick={() => handleTableChange(table.id)}>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Database className="h-5 w-5 text-primary shrink-0" />
                              <CardTitle className="text-sm truncate">{table.name}</CardTitle>
                            </div>
                            <p className="text-xs text-muted-foreground">{table.columns.length} coluna(s)</p>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {sharedTables.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Compartilhadas Comigo ({sharedTables.length})
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {sharedTables.map((table) => (
                        <Card key={table.id} className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/50" onClick={() => handleTableChange(table.id)}>
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <Database className="h-5 w-5 text-primary shrink-0" />
                              <CardTitle className="text-sm truncate">{table.name}</CardTitle>
                            </div>
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] py-0 h-4 gap-1">
                                  {table.permission === 'edit' ? <PencilLine className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  {table.permission === 'edit' ? 'EdiÃ§Ã£o' : 'VisualizaÃ§Ã£o'}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5">{table.columns.length} coluna(s)</p>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Card className="ring-2 ring-primary">
              <CardHeader className="p-3 flex-row items-center gap-2">
                <Database className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <CardTitle className="text-sm">{selectedTable?.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{selectedTable?.columns.length} coluna(s)</p>
                </div>
              </CardHeader>
            </Card>
            <Button variant="ghost" size="sm" onClick={handleBackToTableSelection} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Trocar tabela
            </Button>
          </div>
        )}

        {selectedTableId && selectedTable && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addFilter}>Adicionar Filtro</Button>
                  {(filters.length > 0 || searchGlobal) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar Filtros</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Busca global em todos os campos..." value={searchGlobal} onChange={(e) => setSearchGlobal(e.target.value)} className="max-w-md" />
                </div>
                {filters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2 flex-wrap">
                    <Select value={filter.column} onValueChange={(v) => updateFilter(index, 'column', v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{selectedTable.columns.map((col) => (<SelectItem key={col.name} value={col.name}>{col.display_name}</SelectItem>))}</SelectContent>
                    </Select>
                    <Select value={filter.operator} onValueChange={(v) => updateFilter(index, 'operator', v as ColumnFilter['operator'])}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">ContÃ©m</SelectItem>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="starts">ComeÃ§a com</SelectItem>
                        <SelectItem value="ends">Termina com</SelectItem>
                        <SelectItem value="greater">Maior que</SelectItem>
                        <SelectItem value="less">Menor que</SelectItem>
                      </SelectContent>
                    </Select>
                    <AutocompleteInput placeholder="Valor..." value={filter.value} onChange={(e) => updateFilter(index, 'value', e.target.value)} suggestions={getSuggestions(filter.column, filter.value)} className="w-48" />
                    <Button variant="ghost" size="icon" onClick={() => removeFilter(index)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">Resultados ({filteredData.length} registro{filteredData.length !== 1 ? 's' : ''})</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={openEntryDialog}><Plus className="h-4 w-4 mr-2" />Novo Registro</Button>
                  {selectedRows.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)} disabled={isDeletingBulk}>
                      {isDeletingBulk ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Excluir ({selectedRows.size})
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Columns className="h-4 w-4 mr-2" />Colunas{displayedColumns.length < selectedTable.columns.length && (<span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">{displayedColumns.length}/{selectedTable.columns.length}</span>)}</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="flex items-center justify-between"><span>Exibir Colunas</span>{displayedColumns.length < selectedTable.columns.length && (<Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={showAllColumns}>Mostrar todas</Button>)}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {selectedTable.columns.map((col) => (
                        <DropdownMenuCheckboxItem key={col.name} checked={isColumnVisible(col.name)} onCheckedChange={() => toggleColumnVisibility(col.name)} disabled={isColumnVisible(col.name) && displayedColumns.length === 1}>
                          <span className="flex items-center gap-2">{isColumnVisible(col.name) ? (<Eye className="h-3.5 w-3.5 text-muted-foreground" />) : (<EyeOff className="h-3.5 w-3.5 text-muted-foreground" />)}{col.display_name}</span>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!filteredData.length}><FileText className="h-4 w-4 mr-2" />PDF</Button>
                  <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!filteredData.length}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
                  {selectedTable.is_owner && (<Button variant="outline" size="sm" onClick={() => setPublicViewDialogOpen(true)}><Globe className="h-4 w-4 mr-2" />VisualizaÃ§Ã£o Externa</Button>)}
                </div>
              </CardHeader>
              <CardContent>
                {customDataLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : filteredData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">{customData.length === 0 ? 'Nenhum dado encontrado nesta tabela.' : 'Nenhum resultado encontrado com os filtros aplicados.'}</div>
                ) : (
                  <div className="rounded-md border overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"><Checkbox checked={selectedRows.size === filteredData.length && filteredData.length > 0} onCheckedChange={toggleAllSelection} /></TableHead>
                          {displayedColumns.map((col) => (<TableHead key={col.name} className="whitespace-nowrap">{col.display_name}</TableHead>))}
                          <TableHead className="w-24 text-right">AÃ§Ãµes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell><Checkbox checked={selectedRows.has(row.id)} onCheckedChange={() => toggleRowSelection(row.id)} /></TableCell>
                            {displayedColumns.map((col) => (
                              <TableCell key={col.name} className="whitespace-nowrap">
                                {editingRowId === row.id && col.column_type !== 'formula' ? (<Input value={editingData[col.name] || ''} onChange={(e) => setEditingData({ ...editingData, [col.name]: e.target.value })} className="h-8 min-w-[100px]" />) : (formatCellValue(row.data[col.name], col.column_type, col, row.data))}
                              </TableCell>
                            ))}
                            <TableCell className="text-right">
                              {editingRowId === row.id ? (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={saveEditing} title="Salvar"><Save className="h-4 w-4 text-primary" /></Button>
                                  <Button variant="ghost" size="icon" onClick={cancelEditing} title="Cancelar"><XCircle className="h-4 w-4 text-muted-foreground" /></Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => startEditing(row)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => confirmDeleteRow(row.id)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {tablesLoading && (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}

        {!tablesLoading && !selectedTableId && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">Selecione uma tabela para consultar os dados.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar ExclusÃ£o</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este registro? Esta aÃ§Ã£o nÃ£o pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteRow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ExclusÃ£o em Massa</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {selectedRows.size} registro{selectedRows.size !== 1 ? 's' : ''}? Esta aÃ§Ã£o nÃ£o pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBulk}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeletingBulk} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingBulk ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Excluir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Registro - {selectedTable?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedTable?.columns.map((col, colIndex) => {
                const inputProps = getInputProps(col.column_type);
                const suggestions = getSuggestions(col.name, newEntryData[col.name] || '');
                const useAutocomplete = col.column_type === 'text' || !col.column_type;
                return (
                  <div key={col.id} className="space-y-1.5">
                    <Label htmlFor={`new-${col.name}`} className="text-sm">{col.display_name}</Label>
                    {useAutocomplete ? (
                      <AutocompleteInput id={`new-${col.name}`} value={newEntryData[col.name] || ''} onChange={(e) => handleNewEntryChange(col.name, e.target.value)} onPaste={(e) => handleNewEntryPaste(e, colIndex)} suggestions={suggestions} placeholder={col.display_name} className="h-9" />
                    ) : (
                      <Input id={`new-${col.name}`} {...inputProps} value={newEntryData[col.name] || ''} onChange={(e) => handleNewEntryChange(col.name, e.target.value)} onPaste={(e) => handleNewEntryPaste(e, colIndex)} placeholder={col.display_name} className="h-9" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitNewEntry} disabled={isNewEntryEmpty || isSubmitting}>
                {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>) : (<><Plus className="h-4 w-4 mr-2" />Adicionar Registro</>)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PublicViewDialog tableId={selectedTableId || null} tableName={selectedTable?.name || ''} columns={selectedTable?.columns || []} isOpen={publicViewDialogOpen} onClose={() => setPublicViewDialogOpen(false)} />
    </ModuleSidebarLayout>
  );
}