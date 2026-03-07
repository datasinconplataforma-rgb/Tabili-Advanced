import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCustomTables, useCustomTableData } from '@/hooks/useCustomTables';
import { useAllTablesData } from '@/hooks/useAllTablesData';
import { ProjectFilter } from '@/components/ProjectFilter';
import { useTableSuggestions } from '@/hooks/useAutocompleteSuggestions';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Send, FileInput, Upload, ArrowLeft, Search, Database, Share2, Eye, PencilLine } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { BulkEntrySpreadsheet } from '@/components/BulkEntrySpreadsheet';
import { EntryModeSelector, type EntryMode } from '@/components/entrada/EntryModeSelector';
import { IndividualEntryForm } from '@/components/entrada/IndividualEntryForm';
import { EntryReviewList, type ReviewEntry } from '@/components/entrada/EntryReviewList';
import * as XLSX from 'xlsx';

const menuItems: ModuleMenuItem[] = [
  { id: "entrada", label: "Entrada de Dados", icon: Plus, href: "/entrada" },
];

interface BulkRow {
  tempId: string;
  data: Record<string, string>;
}

export default function EntradaDadosModule() {
  const location = useLocation();
  const { tables, loading: tablesLoading } = useCustomTables();
  const { allTablesData } = useAllTablesData();
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('__all__');
  const [entryMode, setEntryMode] = useState<EntryMode>(null);

  // Pre-select table from navigation state
  useEffect(() => {
    const state = location.state as { selectedTableId?: string } | null;
    if (state?.selectedTableId && tables.length > 0) {
      const exists = tables.find(t => t.id === state.selectedTableId);
      if (exists) {
        setSelectedTableId(state.selectedTableId);
        // Clear the state so it doesn't persist on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, tables]);

  const { ownedTables, sharedTables } = useMemo(() => {
    // Sort tables alphabetically
    const sorted = [...tables].sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    
    // Apply project filter
    const projectFiltered = projectFilter === '__all__'
      ? sorted
      : projectFilter === '__none__'
        ? sorted.filter(t => !t.project_id)
        : sorted.filter(t => t.project_id === projectFilter);
    
    // Apply search filter
    const filtered = searchFilter.trim() 
      ? projectFiltered.filter(table => 
          table.name.toLowerCase().includes(searchFilter.toLowerCase())
        )
      : projectFiltered;
    
    // Separate owned from shared
    return {
      ownedTables: filtered.filter(t => t.is_owner),
      sharedTables: filtered.filter(t => !t.is_owner),
    };
  }, [tables, searchFilter, projectFilter]);

  const allFilteredTables = [...ownedTables, ...sharedTables];
  
  // Individual mode state
  const [reviewEntries, setReviewEntries] = useState<ReviewEntry[]>([]);
  const [isSubmittingIndividual, setIsSubmittingIndividual] = useState(false);
  
  // Batch mode state
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const { addRowWithData, addMultipleRowsWithData } = useCustomTableData(selectedTableId || null, selectedTable?.name);
  const { getSuggestions } = useTableSuggestions(selectedTableId || null);

  // Reset state when table changes
  useEffect(() => {
    setEntryMode(null);
    setReviewEntries([]);
    setBulkRows([]);
  }, [selectedTableId]);

  // Individual mode handlers
  const handleAddToReview = (data: Record<string, string>) => {
    setReviewEntries((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), data },
    ]);
  };

  const handleRemoveFromReview = (tempId: string) => {
    setReviewEntries((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  const handleUpdateReviewEntry = (tempId: string, data: Record<string, string>) => {
    setReviewEntries((prev) => 
      prev.map((e) => e.tempId === tempId ? { ...e, data } : e)
    );
  };

  const handleSubmitIndividual = async () => {
    if (reviewEntries.length === 0) return;

    setIsSubmittingIndividual(true);
    try {
      for (const entry of reviewEntries) {
        await addRowWithData(entry.data);
      }
      
      toast({ title: `${reviewEntries.length} registro(s) enviado(s) com sucesso!` });
      setReviewEntries([]);
    } catch (error) {
      toast({ title: 'Erro ao enviar dados', variant: 'destructive' });
    } finally {
      setIsSubmittingIndividual(false);
    }
  };

  // Batch mode handlers
  const addBulkRow = () => {
    if (!selectedTable) return;
    const newRow: BulkRow = {
      tempId: crypto.randomUUID(),
      data: selectedTable.columns.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {}),
    };
    setBulkRows((prev) => [...prev, newRow]);
  };

  const addMultipleBulkRows = (count: number) => {
    if (!selectedTable) return;
    const newRows: BulkRow[] = Array.from({ length: count }, () => ({
      tempId: crypto.randomUUID(),
      data: selectedTable.columns.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {}),
    }));
    setBulkRows((prev) => [...prev, ...newRows]);
  };

  const removeBulkRow = (tempId: string) => {
    setBulkRows((prev) => prev.filter((row) => row.tempId !== tempId));
  };

  const handleBulkSubmit = async () => {
    if (!selectedTableId || bulkRows.length === 0 || !selectedTable) return;

    // Filter out completely empty rows
    const nonEmptyRows = bulkRows.filter((row) =>
      Object.values(row.data).some((v) => v.trim())
    );

    if (nonEmptyRows.length === 0) {
      toast({ title: 'Nenhum dado para enviar', variant: 'destructive' });
      return;
    }

    // Validate required fields
    const requiredColumns = selectedTable.columns.filter(col => col.required);
    
    if (requiredColumns.length > 0) {
      const invalidRowIndices: number[] = [];
      nonEmptyRows.forEach((row, index) => {
        const isMissingRequired = requiredColumns.some(col => !row.data[col.name]?.trim());
        if (isMissingRequired) {
          invalidRowIndices.push(index + 1);
        }
      });

      if (invalidRowIndices.length > 0) {
        toast({ 
          title: 'Campos obrigatórios faltando', 
          description: `Verifique as linhas: ${invalidRowIndices.slice(0, 5).join(', ')}${invalidRowIndices.length > 5 ? '...' : ''}. Campos marcados como obrigatórios devem ser preenchidos.`,
          variant: 'destructive' 
        });
        return;
      }
    }

    setIsSubmittingBulk(true);
    setBulkProgress({ current: 0, total: nonEmptyRows.length });
    
    try {
      // Evaluate formulas for each row before sending
      const rowsData = nonEmptyRows.map((row) => {
        const rowWithFormulas = { ...row.data };
        selectedTable.columns.forEach(col => {
          if (col.column_type === 'formula' && col.formula_config) {
            const result = evaluateFormula(col.formula_config, row.data, allTablesData);
            if (result !== null && result !== undefined) {
              rowWithFormulas[col.name] = String(result);
            }
          }
        });
        return rowWithFormulas;
      });

      const result = await addMultipleRowsWithData(rowsData, (current, total) => {
        setBulkProgress({ current, total });
      });
      
      if (result.success) {
        setBulkRows([]);
        toast({ title: `${result.imported} registro(s) enviado(s) com sucesso!` });
      }
    } catch (error) {
      toast({ title: 'Erro ao enviar dados', variant: 'destructive' });
    } finally {
      setIsSubmittingBulk(false);
      setBulkProgress(null);
    }
  };

  // Excel import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTable) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      if (jsonData.length === 0) {
        toast({ title: 'Arquivo vazio', variant: 'destructive' });
        return;
      }

      const columnMap: Record<string, string> = {};
      const firstRow = jsonData[0];
      const excelHeaders = Object.keys(firstRow);

      selectedTable.columns.forEach((col) => {
        const matchingHeader = excelHeaders.find(
          (h) => h.toLowerCase().trim() === col.display_name.toLowerCase().trim() ||
                 h.toLowerCase().trim() === col.name.toLowerCase().trim()
        );
        if (matchingHeader) {
          columnMap[matchingHeader] = col.name;
        }
      });

      if (Object.keys(columnMap).length === 0) {
        toast({
          title: 'Nenhuma coluna corresponde',
          description: 'Os cabeçalhos do Excel devem corresponder aos nomes das colunas da tabela.',
          variant: 'destructive',
        });
        return;
      }

      const importedRows: BulkRow[] = jsonData.map((row) => {
        const rowData: Record<string, string> = {};
        selectedTable.columns.forEach((col) => {
          rowData[col.name] = '';
        });

        Object.entries(row).forEach(([header, value]) => {
          const colName = columnMap[header];
          if (colName) {
            rowData[colName] = value != null ? String(value) : '';
          }
        });

        return {
          tempId: crypto.randomUUID(),
          data: rowData,
        };
      });

      setBulkRows((prev) => [...prev, ...importedRows]);
      toast({ title: `${importedRows.length} linha(s) importada(s) do Excel!` });
    } catch (error) {
      toast({ title: 'Erro ao importar arquivo', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBackToModeSelection = () => {
    setEntryMode(null);
  };

  return (
    <ModuleSidebarLayout
      moduleName="Entrada de Dados"
      moduleIcon={FileInput}
      menuItems={menuItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entrada de Dados</h1>
          <p className="text-muted-foreground">Adicione novos registros às suas tabelas</p>
        </div>

        {/* Table Selection as Blocks */}
        {!selectedTableId ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar tabelas..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
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
                  <FileInput className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {searchFilter ? 'Nenhuma tabela encontrada com o filtro atual.' : 'Nenhuma tabela criada ainda.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Owned Tables Section */}
                {ownedTables.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Minhas Tabelas ({ownedTables.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {ownedTables.map((table) => (
                        <Card 
                          key={table.id} 
                          className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/50"
                          onClick={() => setSelectedTableId(table.id)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <FileInput className="h-5 w-5 text-primary shrink-0" />
                              <CardTitle className="text-sm truncate">{table.name}</CardTitle>
                            </div>
                            <CardDescription className="text-xs">{table.columns.length} coluna(s)</CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared Tables Section */}
                {sharedTables.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Compartilhadas Comigo ({sharedTables.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {sharedTables.map((table) => (
                        <Card 
                          key={table.id} 
                          className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/50"
                          onClick={() => setSelectedTableId(table.id)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-2">
                              <FileInput className="h-5 w-5 text-primary shrink-0" />
                              <CardTitle className="text-sm truncate">{table.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs gap-1">
                                {table.permission === 'edit' ? <PencilLine className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                {table.permission === 'edit' ? 'Edição' : 'Visualização'}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs">{table.columns.length} coluna(s)</CardDescription>
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
                <FileInput className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <CardTitle className="text-sm">{selectedTable?.name}</CardTitle>
                  <CardDescription className="text-xs">{selectedTable?.columns.length} coluna(s)</CardDescription>
                </div>
              </CardHeader>
            </Card>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedTableId(''); setEntryMode(null); setSearchFilter(''); }} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Trocar tabela
            </Button>
            {entryMode && (
              <Button variant="ghost" size="sm" onClick={handleBackToModeSelection} className="gap-1.5">
                Trocar modo
              </Button>
            )}
          </div>
        )}

        {selectedTableId && selectedTable && !entryMode ? (
          // Mode Selection
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Escolha o modo de entrada:</p>
            <EntryModeSelector selectedMode={entryMode} onSelectMode={setEntryMode} />
          </div>
        ) : selectedTable && entryMode === 'individual' ? (
          // Individual Mode
          <div className="space-y-6">
            <IndividualEntryForm
              columns={selectedTable.columns}
              onAddToReview={handleAddToReview}
              getSuggestions={getSuggestions}
              allTablesData={allTablesData}
            />
            <EntryReviewList
              columns={selectedTable.columns}
              entries={reviewEntries}
              onRemoveEntry={handleRemoveFromReview}
              onUpdateEntry={handleUpdateReviewEntry}
              onSubmitAll={handleSubmitIndividual}
              isSubmitting={isSubmittingIndividual}
            />
          </div>
        ) : selectedTable && entryMode === 'batch' ? (
          // Batch Mode
          <Card>
            <CardHeader>
              <CardTitle>Lançamento em Lote</CardTitle>
              <CardDescription>
                Adicione várias linhas de uma vez - comportamento similar ao Excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={addBulkRow} className="gap-1">
                    <Plus className="h-4 w-4" />
                    +1 Linha
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addMultipleBulkRows(5)} className="gap-1">
                    <Plus className="h-4 w-4" />
                    +5 Linhas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addMultipleBulkRows(10)} className="gap-1">
                    <Plus className="h-4 w-4" />
                    +10 Linhas
                  </Button>
                  <div className="border-l border-border h-6 mx-2" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="gap-1"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Importar Excel
                  </Button>
                </div>

                <BulkEntrySpreadsheet
                  columns={selectedTable.columns}
                  rows={bulkRows}
                  onRowsChange={setBulkRows}
                  onRemoveRow={removeBulkRow}
                  allTablesData={allTablesData}
                />

                {bulkRows.length > 0 && (
                  <div className="flex items-center justify-end gap-4 pt-2">
                    {bulkProgress && (
                      <span className="text-sm text-muted-foreground">
                        {bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)
                      </span>
                    )}
                    <Button
                      onClick={handleBulkSubmit}
                      disabled={isSubmittingBulk}
                      className="gap-2"
                    >
                      {isSubmittingBulk ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isSubmittingBulk ? 'Enviando...' : `Enviar ${bulkRows.length} Linha(s)`}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ModuleSidebarLayout>
  );
}