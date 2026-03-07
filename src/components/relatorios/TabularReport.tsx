import { useState, useMemo } from "react";
import { formatDisplayValue, formatCurrency } from "@/lib/formatters";
import { Download, Filter, X, Eye, EyeOff, Columns, FileSpreadsheet, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CustomTable, CustomColumn, ColumnType } from "@/hooks/useCustomTables";
import { evaluateFormula } from "@/components/FormulaEditor";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface TabularReportProps {
  selectedTable: CustomTable | undefined;
  tableData: { id: string; table_id: string; data: Record<string, string> }[];
  allTablesData?: Record<string, Record<string, string>[]>;
}

interface ColumnFilter {
  column: string;
  operator: 'contains' | 'equals' | 'starts' | 'ends' | 'greater' | 'less';
  value: string;
}

const formatCellValue = (
  value: string | undefined,
  columnType: ColumnType,
  column?: CustomColumn,
  rowData?: Record<string, string>,
  allTablesData?: Record<string, Record<string, string>[]>
): string => {
  if (columnType === 'formula' && column?.formula_config && rowData) {
    const result = evaluateFormula(column.formula_config, rowData, allTablesData);
    if (result !== null) {
      if (typeof result === 'number') {
        return formatCurrency(result);
      }
      return String(result);
    }
    return '';
  }
  
  if (!value) return '';
  return formatDisplayValue(value, columnType) || '';
};

export function TabularReport({ selectedTable, tableData, allTablesData }: TabularReportProps) {
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [searchGlobal, setSearchGlobal] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

  // Initialize visible columns when table changes
  const displayedColumns = useMemo(() => {
    if (!selectedTable) return [];
    if (visibleColumns.size === 0) {
      return selectedTable.columns;
    }
    return selectedTable.columns.filter(col => visibleColumns.has(col.name));
  }, [selectedTable, visibleColumns]);

  const toggleColumnVisibility = (columnName: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.size === 0 && selectedTable) {
        selectedTable.columns.forEach(c => newSet.add(c.name));
      }
      if (newSet.has(columnName)) {
        if (newSet.size > 1) {
          newSet.delete(columnName);
        }
      } else {
        newSet.add(columnName);
      }
      return newSet;
    });
  };

  const showAllColumns = () => {
    if (selectedTable) {
      setVisibleColumns(new Set(selectedTable.columns.map(c => c.name)));
    }
  };

  const hideAllColumns = () => {
    if (selectedTable && selectedTable.columns.length > 0) {
      setVisibleColumns(new Set([selectedTable.columns[0].name]));
    }
  };

  const isColumnVisible = (columnName: string) => {
    if (visibleColumns.size === 0) return true;
    return visibleColumns.has(columnName);
  };

  const addFilter = () => {
    if (selectedTable && selectedTable.columns.length > 0) {
      setFilters([...filters, { 
        column: selectedTable.columns[0].name, 
        operator: 'contains', 
        value: '' 
      }]);
    }
  };

  const updateFilter = (index: number, field: keyof ColumnFilter, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearFilters = () => {
    setFilters([]);
    setSearchGlobal('');
  };

  const filteredData = useMemo(() => {
    if (!tableData.length) return [];

    return tableData.filter((row) => {
      // Global search
      if (searchGlobal) {
        const searchLower = searchGlobal.toLowerCase();
        const matchesGlobal = Object.values(row.data).some(
          (val) => String(val || '').toLowerCase().includes(searchLower)
        );
        if (!matchesGlobal) return false;
      }

      // Column filters
      for (const filter of filters) {
        const cellValue = String(row.data[filter.column] || '').toLowerCase();
        const filterValue = filter.value.toLowerCase();

        if (!filterValue) continue;

        switch (filter.operator) {
          case 'contains':
            if (!cellValue.includes(filterValue)) return false;
            break;
          case 'equals':
            if (cellValue !== filterValue) return false;
            break;
          case 'starts':
            if (!cellValue.startsWith(filterValue)) return false;
            break;
          case 'ends':
            if (!cellValue.endsWith(filterValue)) return false;
            break;
          case 'greater':
            if (parseFloat(cellValue) <= parseFloat(filterValue)) return false;
            break;
          case 'less':
            if (parseFloat(cellValue) >= parseFloat(filterValue)) return false;
            break;
        }
      }

      return true;
    });
  }, [tableData, filters, searchGlobal]);

  const exportToPDF = () => {
    if (!selectedTable || !filteredData.length) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.text(`Relatório: ${selectedTable.name}`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    doc.text(`Total de registros: ${filteredData.length}`, 14, 28);

    const headers = displayedColumns.map((c) => c.display_name);
    
    const body = filteredData.map((row) =>
      displayedColumns.map((c) => formatCellValue(row.data[c.name], c.column_type, c, row.data, allTablesData))
    );

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 8 },
    });

    doc.save(`${selectedTable.name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportToExcel = () => {
    if (!selectedTable || !filteredData.length) return;

    const headers = displayedColumns.map((c) => c.display_name);
    const rows = filteredData.map((row) =>
      displayedColumns.reduce((acc, c) => {
        acc[c.display_name] = formatCellValue(row.data[c.name], c.column_type, c, row.data, allTablesData);
        return acc;
      }, {} as Record<string, string>)
    );

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedTable.name);
    XLSX.writeFile(wb, `${selectedTable.name}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Selecione uma tabela para gerar o relatório tabelado
      </div>
    );
  }

  const visibleCount = visibleColumns.size === 0 ? selectedTable.columns.length : visibleColumns.size;
  const totalColumns = selectedTable.columns.length;

  return (
    <div className="space-y-6">
      {/* Search and Column Visibility */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar em todos os campos..."
            value={searchGlobal}
            onChange={(e) => setSearchGlobal(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns className="h-4 w-4" />
              Colunas ({visibleCount}/{totalColumns})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Visibilidade das Colunas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex gap-2 p-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={showAllColumns}>
                <Eye className="h-3 w-3 mr-1" />
                Todas
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={hideAllColumns}>
                <EyeOff className="h-3 w-3 mr-1" />
                Mínimo
              </Button>
            </div>
            <DropdownMenuSeparator />
            {selectedTable.columns.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={isColumnVisible(col.name)}
                onCheckedChange={() => toggleColumnVisibility(col.name)}
              >
                {col.display_name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={addFilter} className="gap-2">
          <Filter className="h-4 w-4" />
          Adicionar Filtro
        </Button>

        {filteredData.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </>
        )}
      </div>

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Filtros Ativos</Label>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Limpar todos
            </Button>
          </div>
          
          <div className="space-y-2">
            {filters.map((filter, index) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <Select
                  value={filter.column}
                  onValueChange={(v) => updateFilter(index, 'column', v)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTable.columns.map((col) => (
                      <SelectItem key={col.id} value={col.name}>
                        {col.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filter.operator}
                  onValueChange={(v) => updateFilter(index, 'operator', v as ColumnFilter['operator'])}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="starts">Começa com</SelectItem>
                    <SelectItem value="ends">Termina com</SelectItem>
                    <SelectItem value="greater">Maior que</SelectItem>
                    <SelectItem value="less">Menor que</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Valor..."
                  value={filter.value}
                  onChange={(e) => updateFilter(index, 'value', e.target.value)}
                  className="w-[150px]"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{filteredData.length}</Badge>
        <span>registros encontrados</span>
        {(filters.length > 0 || searchGlobal) && (
          <span className="text-xs">
            (de {tableData.length} total)
          </span>
        )}
      </div>

      {/* Data Table */}
      {filteredData.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {displayedColumns.map((col) => (
                    <TableHead key={col.id} className="font-semibold whitespace-nowrap">
                      {col.display_name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => (
                  <TableRow key={row.id}>
                    {displayedColumns.map((col) => (
                      <TableCell key={col.id} className="whitespace-nowrap">
                        {formatCellValue(row.data[col.name], col.column_type, col, row.data, allTablesData)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground border rounded-lg">
          {tableData.length === 0 
            ? "Nenhum dado na tabela selecionada"
            : "Nenhum registro encontrado com os filtros aplicados"
          }
        </div>
      )}
    </div>
  );
}