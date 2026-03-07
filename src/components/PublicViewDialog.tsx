import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicView, FilterConfig, MultiFilterConfig, FilterLogic } from '@/hooks/usePublicView';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, RefreshCw, ExternalLink, Eye, CheckSquare, Square, Filter, X, Plus, Lock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Column {
  name: string;
  display_name: string;
  column_type: string;
}

interface PublicViewDialogProps {
  tableId: string | null;
  tableName: string;
  columns: Column[];
  isOpen: boolean;
  onClose: () => void;
}

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'starts_with', label: 'Começa com' },
  { value: 'ends_with', label: 'Termina com' },
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
] as const;

const createEmptyFilter = (): FilterConfig => ({
  column: '',
  operator: 'equals',
  value: '',
});

export function PublicViewDialog({
  tableId,
  tableName,
  columns,
  isOpen,
  onClose,
}: PublicViewDialogProps) {
  const { settings, loading, enableView, updateSettings, disableView, regenerateToken, getPublicUrl } = usePublicView(tableId);
  const { toast } = useToast();
  
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [filters, setFilters] = useState<FilterConfig[]>([createEmptyFilter()]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('AND');
  const [accessPin, setAccessPin] = useState('');

  const generatePin = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  // Initialize state when dialog opens or settings change
  useEffect(() => {
    if (settings?.visible_columns?.length) {
      setSelectedColumns(new Set(settings.visible_columns));
    } else if (columns.length > 0) {
      setSelectedColumns(new Set(columns.map(c => c.name)));
    }

    if (settings?.filter_config && settings.filter_config.filters.length > 0) {
      setFilterEnabled(true);
      setFilters(settings.filter_config.filters);
      setFilterLogic(settings.filter_config.logic);
    } else {
      setFilterEnabled(false);
      setFilters([createEmptyFilter()]);
      setFilterLogic('AND');
    }

    // Initialize PIN - auto-generate if no settings yet
    if (settings?.access_pin) {
      setAccessPin(settings.access_pin);
    } else if (!settings) {
      setAccessPin(generatePin());
    }
  }, [settings, columns, isOpen]);

  const toggleColumn = (columnName: string) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnName)) {
        // Don't allow deselecting if it's the last one
        if (newSet.size > 1) {
          newSet.delete(columnName);
        }
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  const selectAllColumns = () => {
    setSelectedColumns(new Set(columns.map(c => c.name)));
  };

  const deselectAllColumns = () => {
    // Keep at least one column
    if (columns.length > 0) {
      setSelectedColumns(new Set([columns[0].name]));
    }
  };

  const updateFilter = (index: number, field: keyof FilterConfig, value: string) => {
    setFilters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addFilter = () => {
    setFilters(prev => [...prev, createEmptyFilter()]);
  };

  const removeFilter = (index: number) => {
    setFilters(prev => {
      if (prev.length <= 1) {
        return [createEmptyFilter()];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getFilterConfig = (): MultiFilterConfig | null => {
    if (!filterEnabled) return null;
    
    const validFilters = filters.filter(f => f.column && f.value);
    if (validFilters.length === 0) return null;
    
    return {
      filters: validFilters,
      logic: filterLogic,
    };
  };

  const handleEnable = async () => {
    const pinToSave = accessPin.trim().length === 4 ? accessPin.trim() : null;
    await enableView(Array.from(selectedColumns), getFilterConfig(), pinToSave);
  };

  const handleSave = async () => {
    const pinToSave = accessPin.trim().length === 4 ? accessPin.trim() : null;
    await updateSettings(Array.from(selectedColumns), getFilterConfig(), pinToSave);
  };

  const handleDisable = async () => {
    if (confirm('Tem certeza que deseja desabilitar a visualização externa? O link público deixará de funcionar.')) {
      await disableView();
    }
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link copiado!',
        description: 'O link foi copiado para a área de transferência.',
      });
    }
  };

  const handleOpenLink = () => {
    const url = getPublicUrl();
    if (url) {
      window.open(url, '_blank');
    }
  };

  const clearAllFilters = () => {
    setFilterEnabled(false);
    setFilters([createEmptyFilter()]);
    setFilterLogic('AND');
  };

  const publicUrl = getPublicUrl();
  const isEnabled = settings?.is_enabled;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visualização Externa
          </DialogTitle>
          <DialogDescription>
            Compartilhe a tabela "{tableName}" através de um link público (somente leitura)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loading && !settings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Column Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Colunas visíveis ({selectedColumns.size}/{columns.length})
                  </Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={selectAllColumns}
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Todas
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={deselectAllColumns}
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="h-[150px] rounded-md border p-3">
                  <div className="space-y-2">
                    {columns.map((col) => (
                      <div 
                        key={col.name} 
                        className="flex items-center space-x-2 py-1"
                      >
                        <Checkbox
                          id={`col-${col.name}`}
                          checked={selectedColumns.has(col.name)}
                          onCheckedChange={() => toggleColumn(col.name)}
                          disabled={selectedColumns.has(col.name) && selectedColumns.size === 1}
                        />
                        <label
                          htmlFor={`col-${col.name}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {col.display_name}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({col.column_type})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Data Filter Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtrar Dados
                  </Label>
                  {filterEnabled && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-muted-foreground"
                      onClick={clearAllFilters}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remover filtros
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id="filter-enabled"
                    checked={filterEnabled}
                    onCheckedChange={(checked) => setFilterEnabled(!!checked)}
                  />
                  <label
                    htmlFor="filter-enabled"
                    className="text-sm leading-none cursor-pointer"
                  >
                    Aplicar filtros aos dados exibidos
                  </label>
                </div>

                {filterEnabled && (
                  <div className="space-y-3 p-3 rounded-md border bg-muted/30">
                    {/* Logic selector */}
                    {filters.length > 1 && (
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Label className="text-xs">Combinar filtros com:</Label>
                        <Select value={filterLogic} onValueChange={(v) => setFilterLogic(v as FilterLogic)}>
                          <SelectTrigger className="h-7 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">E (AND)</SelectItem>
                            <SelectItem value="OR">OU (OR)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Filter list */}
                    <div className="space-y-3">
                      {filters.map((filter, index) => (
                        <div key={index} className="space-y-2">
                          {index > 0 && (
                            <div className="text-xs text-center text-muted-foreground py-1">
                              {filterLogic === 'AND' ? 'E' : 'OU'}
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Coluna</Label>
                                  <Select 
                                    value={filter.column} 
                                    onValueChange={(v) => updateFilter(index, 'column', v)}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Selecionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {columns.map((col) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          {col.display_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Operador</Label>
                                  <Select 
                                    value={filter.operator} 
                                    onValueChange={(v) => updateFilter(index, 'operator', v)}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FILTER_OPERATORS.map((op) => (
                                        <SelectItem key={op.value} value={op.value}>
                                          {op.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Valor</Label>
                                <Input
                                  value={filter.value}
                                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                  placeholder="Digite o valor para filtrar..."
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 mt-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFilter(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add filter button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={addFilter}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Filtro
                    </Button>
                  </div>
                )}
              </div>

              {/* PIN de Acesso */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  PIN de Acesso (4 dígitos)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={accessPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setAccessPin(val);
                    }}
                    placeholder="Ex: 1234"
                    maxLength={4}
                    className="w-32 font-mono text-center tracking-widest"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAccessPin(generatePin())}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Gerar
                  </Button>
                  {accessPin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => setAccessPin('')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {accessPin.length === 4 
                    ? 'O visitante precisará informar este PIN para acessar os dados.'
                    : 'Deixe vazio para acesso sem PIN (qualquer pessoa com o link poderá visualizar).'}
                </p>
              </div>

              {/* Link Section - only show when enabled */}
              {isEnabled && publicUrl && (
                <div className="space-y-2">
                  <Label>Link Público</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={publicUrl} 
                      readOnly 
                      className="text-sm font-mono"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleOpenLink} title="Abrir em nova aba">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground"
                    onClick={() => regenerateToken()}
                    disabled={loading}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Gerar novo link (invalida o anterior)
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {isEnabled ? (
                  <>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar Alterações
                    </Button>
                    <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                      Desabilitar
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEnable} className="w-full" disabled={loading || selectedColumns.size === 0}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Eye className="h-4 w-4 mr-2" />
                    Habilitar Visualização Externa
                  </Button>
                )}
              </div>

              {!isEnabled && (
                <p className="text-xs text-muted-foreground text-center">
                  Ao habilitar, um link público será gerado para visualização somente leitura da tabela.
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
