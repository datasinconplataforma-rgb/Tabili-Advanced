import { useState, useMemo } from "react";
import { Download, Filter, X } from "lucide-react";
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
import { CustomTable, CustomColumn } from "@/hooks/useCustomTables";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AggregationType = "count" | "sum" | "avg" | "value";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface PivotTableProps {
  selectedTable: CustomTable | undefined;
  tableData: { id: string; table_id: string; data: Record<string, string> }[];
}

interface FilterItem {
  column: string;
  value: string;
}

interface PivotCell {
  sum: number;
  count: number;
  values: string[];
}

export function PivotTable({ selectedTable, tableData }: PivotTableProps) {
  const [rowField, setRowField] = useState<string>("");
  const [rowField2, setRowField2] = useState<string>("");
  const [columnField, setColumnField] = useState<string>("");
  const [valueField, setValueField] = useState<string>("");
  const [aggregation, setAggregation] = useState<AggregationType>("sum");
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [newFilterColumn, setNewFilterColumn] = useState<string>("");
  const [newFilterValue, setNewFilterValue] = useState<string>("");

  const valueColumn = useMemo(
    () => selectedTable?.columns.find((c) => c.name === valueField),
    [selectedTable, valueField]
  );

  const isValueCurrency = valueColumn?.column_type === 'currency';

  const formatValue = (value: number | string, isRawValue = false) => {
    if (isRawValue || aggregation === 'value') {
      return String(value);
    }
    if (aggregation === 'count') return String(value);
    if (typeof value === 'number') {
      if (isValueCurrency) return formatCurrency(value);
      return formatNumber(value);
    }
    return String(value);
  };

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (filters.length === 0) return tableData;
    return tableData.filter(row => {
      return filters.every(filter => {
        const cellValue = String(row.data[filter.column] || '').toLowerCase();
        return cellValue.includes(filter.value.toLowerCase());
      });
    });
  }, [tableData, filters]);

  // Get unique values for columns
  const getUniqueValues = (columnName: string): string[] => {
    const values = new Set<string>();
    filteredData.forEach(row => {
      const val = row.data[columnName];
      if (val) values.add(val);
    });
    return Array.from(values).sort();
  };

  // Build pivot table with two-level rows support
  const pivotData = useMemo(() => {
    // Return empty if neither row nor column is selected
    if (!rowField && !columnField) return { 
      rows: [], 
      columns: [], 
      data: {}, 
      rowTotals: {}, 
      colTotals: {}, 
      grandTotal: 0, 
      columnsOnly: false,
      hasSecondLevel: false,
      rowStructure: [] as { primary: string; secondary: string[] }[]
    };

    const hasSecondLevel = !!rowField2 && !!rowField;

    // Columns-only mode: single aggregation row
    if (!rowField && columnField) {
      const columns = getUniqueValues(columnField);
      const colTotals: Record<string, PivotCell> = {};
      let grandTotal: PivotCell = { sum: 0, count: 0, values: [] };

      columns.forEach(c => {
        colTotals[c] = { sum: 0, count: 0, values: [] };
      });

      filteredData.forEach(row => {
        const colVal = row.data[columnField] || "(vazio)";
        const rawVal = valueField ? String(row.data[valueField] || '') : '';
        const numVal = valueField 
          ? parseFloat(String(row.data[valueField]).replace(/\./g, '').replace(',', '.')) || 0 
          : 1;

        if (colTotals[colVal]) {
          colTotals[colVal].sum += numVal;
          colTotals[colVal].count += 1;
          colTotals[colVal].values.push(rawVal);
        }
        grandTotal.sum += numVal;
        grandTotal.count += 1;
        grandTotal.values.push(rawVal);
      });

      const getAggValue = (cell: PivotCell) => {
        if (aggregation === 'value') return cell.values.join(', ');
        if (aggregation === 'count') return cell.count;
        if (aggregation === 'sum') return cell.sum;
        return cell.count > 0 ? cell.sum / cell.count : 0;
      };

      return {
        rows: [],
        columns,
        data: {},
        rowTotals: {},
        colTotals,
        grandTotal: getAggValue(grandTotal),
        columnsOnly: true,
        hasSecondLevel: false,
        rowStructure: []
      };
    }

    // Standard mode with rows (and optional second level)
    const rows = getUniqueValues(rowField);
    const columns = columnField ? getUniqueValues(columnField) : [];
    
    // Build row structure for two-level support
    let rowStructure: { primary: string; secondary: string[] }[] = [];
    if (hasSecondLevel) {
      rows.forEach(primaryRow => {
        const secondaryValues = new Set<string>();
        filteredData.forEach(row => {
          if (row.data[rowField] === primaryRow) {
            const secVal = row.data[rowField2];
            if (secVal) secondaryValues.add(secVal);
          }
        });
        rowStructure.push({
          primary: primaryRow,
          secondary: Array.from(secondaryValues).sort()
        });
      });
    }

    const data: Record<string, Record<string, PivotCell>> = {};
    const rowTotals: Record<string, PivotCell> = {};
    const colTotals: Record<string, PivotCell> = {};
    let grandTotal: PivotCell = { sum: 0, count: 0, values: [] };

    // Initialize
    const initCell = (): PivotCell => ({ sum: 0, count: 0, values: [] });
    
    const allRowKeys = hasSecondLevel 
      ? rowStructure.flatMap(r => [r.primary, ...r.secondary.map(s => `${r.primary}|||${s}`)])
      : rows;

    allRowKeys.forEach(r => {
      data[r] = {};
      rowTotals[r] = initCell();
      columns.forEach(c => {
        data[r][c] = initCell();
      });
    });
    columns.forEach(c => {
      colTotals[c] = initCell();
    });

    // Populate data
    filteredData.forEach(row => {
      const primaryRowVal = row.data[rowField] || "(vazio)";
      const secondaryRowVal = hasSecondLevel ? (row.data[rowField2] || "(vazio)") : null;
      const colVal = columnField ? (row.data[columnField] || "(vazio)") : null;
      const rawVal = valueField ? String(row.data[valueField] || '') : '';
      const numVal = valueField 
        ? parseFloat(String(row.data[valueField]).replace(/\./g, '').replace(',', '.')) || 0 
        : 1;

      // Primary row key
      const primaryKey = primaryRowVal;
      // Combined key for second level
      const combinedKey = hasSecondLevel ? `${primaryRowVal}|||${secondaryRowVal}` : primaryRowVal;

      // Initialize if not exists
      if (!data[primaryKey]) {
        data[primaryKey] = {};
        rowTotals[primaryKey] = initCell();
        columns.forEach(c => {
          data[primaryKey][c] = initCell();
        });
      }
      if (hasSecondLevel && !data[combinedKey]) {
        data[combinedKey] = {};
        rowTotals[combinedKey] = initCell();
        columns.forEach(c => {
          data[combinedKey][c] = initCell();
        });
      }

      // Update primary row
      if (columnField && colVal) {
        if (!data[primaryKey][colVal]) data[primaryKey][colVal] = initCell();
        data[primaryKey][colVal].sum += numVal;
        data[primaryKey][colVal].count += 1;
        data[primaryKey][colVal].values.push(rawVal);

        if (!colTotals[colVal]) colTotals[colVal] = initCell();
        colTotals[colVal].sum += numVal;
        colTotals[colVal].count += 1;
        colTotals[colVal].values.push(rawVal);
      }

      // Update secondary row if exists
      if (hasSecondLevel) {
        if (columnField && colVal) {
          if (!data[combinedKey][colVal]) data[combinedKey][colVal] = initCell();
          data[combinedKey][colVal].sum += numVal;
          data[combinedKey][colVal].count += 1;
          data[combinedKey][colVal].values.push(rawVal);
        }
        rowTotals[combinedKey].sum += numVal;
        rowTotals[combinedKey].count += 1;
        rowTotals[combinedKey].values.push(rawVal);
      }

      rowTotals[primaryKey].sum += numVal;
      rowTotals[primaryKey].count += 1;
      rowTotals[primaryKey].values.push(rawVal);
      grandTotal.sum += numVal;
      grandTotal.count += 1;
      grandTotal.values.push(rawVal);
    });

    const getAggValue = (cell: PivotCell) => {
      if (aggregation === 'value') return cell.values.join(', ');
      if (aggregation === 'count') return cell.count;
      if (aggregation === 'sum') return cell.sum;
      return cell.count > 0 ? cell.sum / cell.count : 0;
    };

    return {
      rows,
      columns,
      data,
      rowTotals,
      colTotals,
      grandTotal: getAggValue(grandTotal),
      columnsOnly: false,
      hasSecondLevel,
      rowStructure
    };
  }, [filteredData, rowField, rowField2, columnField, valueField, aggregation]);

  const getCellValue = (rowKey: string, colKey: string) => {
    const cell = pivotData.data[rowKey]?.[colKey];
    if (!cell) return aggregation === 'value' ? '' : 0;
    if (aggregation === 'value') return cell.values.join(', ');
    if (aggregation === 'count') return cell.count;
    if (aggregation === 'sum') return cell.sum;
    return cell.count > 0 ? cell.sum / cell.count : 0;
  };

  const getRowTotal = (rowKey: string) => {
    const total = pivotData.rowTotals[rowKey];
    if (!total) return aggregation === 'value' ? '' : 0;
    if (aggregation === 'value') return total.values.join(', ');
    if (aggregation === 'count') return total.count;
    if (aggregation === 'sum') return total.sum;
    return total.count > 0 ? total.sum / total.count : 0;
  };

  const getColTotal = (colKey: string) => {
    const total = pivotData.colTotals[colKey];
    if (!total) return aggregation === 'value' ? '' : 0;
    if (aggregation === 'value') return total.values.join(', ');
    if (aggregation === 'count') return total.count;
    if (aggregation === 'sum') return total.sum;
    return total.count > 0 ? total.sum / total.count : 0;
  };

  const handleAddFilter = () => {
    if (!newFilterColumn || !newFilterValue.trim()) return;
    setFilters([...filters, { column: newFilterColumn, value: newFilterValue.trim() }]);
    setNewFilterColumn("");
    setNewFilterValue("");
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleExportPDF = () => {
    if (!selectedTable || (pivotData.rows.length === 0 && pivotData.columns.length === 0)) return;

    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text(`Tabela Dinâmica - ${selectedTable.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const configText = [
      rowField ? `Linhas: ${rowField}${rowField2 ? ` > ${rowField2}` : ''}` : null,
      columnField ? `Colunas: ${columnField}` : null,
      valueField ? `Valores: ${valueField}` : null,
      `Agregação: ${aggregation === 'count' ? 'Contagem' : aggregation === 'sum' ? 'Soma' : aggregation === 'avg' ? 'Média' : 'Exibir Valor'}`
    ].filter(Boolean).join(' | ');
    doc.text(configText, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);
    
    // Columns-only mode
    if (pivotData.columnsOnly) {
      const headers = [aggregation === 'count' ? 'Contagem' : aggregation === 'sum' ? 'Soma' : aggregation === 'avg' ? 'Média' : 'Valor', ...pivotData.columns, "Total"];
      const pdfData = [[
        selectedTable.columns.find(c => c.name === columnField)?.display_name || columnField,
        ...pivotData.columns.map(col => formatValue(getColTotal(col))),
        formatValue(pivotData.grandTotal),
      ]];
      
      autoTable(doc, {
        head: [headers],
        body: pdfData,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      const headers = [rowField + (rowField2 ? ` / ${rowField2}` : ''), ...pivotData.columns, "Total"];
      const pdfData: string[][] = [];

      if (pivotData.hasSecondLevel) {
        pivotData.rowStructure.forEach(({ primary, secondary }) => {
          // Primary row
          pdfData.push([
            primary,
            ...pivotData.columns.map(col => formatValue(getCellValue(primary, col))),
            formatValue(getRowTotal(primary)),
          ]);
          // Secondary rows
          secondary.forEach(sec => {
            const combinedKey = `${primary}|||${sec}`;
            pdfData.push([
              `  └ ${sec}`,
              ...pivotData.columns.map(col => formatValue(getCellValue(combinedKey, col))),
              formatValue(getRowTotal(combinedKey)),
            ]);
          });
        });
      } else {
        pivotData.rows.forEach(row => {
          pdfData.push([
            row,
            ...pivotData.columns.map(col => formatValue(getCellValue(row, col))),
            formatValue(getRowTotal(row)),
          ]);
        });
      }
      
      // Add totals row if there are columns
      if (pivotData.columns.length > 0) {
        pdfData.push([
          "Total",
          ...pivotData.columns.map(col => formatValue(getColTotal(col))),
          formatValue(pivotData.grandTotal),
        ]);
      }
      
      autoTable(doc, {
        head: [headers],
        body: pdfData,
        startY: 42,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }
    
    doc.save(`tabela_dinamica_${selectedTable.name}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (!selectedTable) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Selecione uma tabela para criar a tabela dinâmica
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <Label>Linhas Nível 1 (opcional)</Label>
          <Select value={rowField || "__none__"} onValueChange={(v) => {
            setRowField(v === "__none__" ? "" : v);
            if (v === "__none__") setRowField2("");
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {selectedTable.columns.map((col) => (
                <SelectItem key={col.id} value={col.name}>
                  {col.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Linhas Nível 2 (opcional)</Label>
          <Select 
            value={rowField2 || "__none__"} 
            onValueChange={(v) => setRowField2(v === "__none__" ? "" : v)}
            disabled={!rowField}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {selectedTable.columns
                .filter(col => col.name !== rowField)
                .map((col) => (
                  <SelectItem key={col.id} value={col.name}>
                    {col.display_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Colunas (opcional)</Label>
          <Select value={columnField || "__none__"} onValueChange={(v) => setColumnField(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {selectedTable.columns.map((col) => (
                <SelectItem key={col.id} value={col.name}>
                  {col.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Valores (opcional)</Label>
          <Select value={valueField || "__none__"} onValueChange={(v) => setValueField(v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Contagem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Contagem</SelectItem>
              {selectedTable.columns.map((col) => (
                <SelectItem key={col.id} value={col.name}>
                  {col.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Agregação</Label>
          <Select value={aggregation} onValueChange={(v) => setAggregation(v as AggregationType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Contagem</SelectItem>
              <SelectItem value="sum">Soma</SelectItem>
              <SelectItem value="avg">Média</SelectItem>
              <SelectItem value="value">Exibir Valor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label>Filtros</Label>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {selectedTable.columns.find(c => c.name === filter.column)?.display_name}: {filter.value}
              <button onClick={() => handleRemoveFilter(index)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          <div className="flex items-center gap-2">
            <Select value={newFilterColumn} onValueChange={setNewFilterColumn}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Coluna" />
              </SelectTrigger>
              <SelectContent>
                {selectedTable.columns.map((col) => (
                  <SelectItem key={col.id} value={col.name}>
                    {col.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newFilterValue}
              onChange={(e) => setNewFilterValue(e.target.value)}
              placeholder="Valor"
              className="w-[120px] h-8"
              onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
            />
            <Button size="sm" variant="outline" onClick={handleAddFilter} disabled={!newFilterColumn || !newFilterValue.trim()}>
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Export Button */}
      {(pivotData.rows.length > 0 || pivotData.columns.length > 0) && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      )}

      {/* Pivot Table */}
      {(rowField || columnField) ? (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 font-bold sticky left-0">
                  {rowField 
                    ? (
                      <>
                        {selectedTable.columns.find(c => c.name === rowField)?.display_name}
                        {rowField2 && ` / ${selectedTable.columns.find(c => c.name === rowField2)?.display_name}`}
                        {columnField && ` × ${selectedTable.columns.find(c => c.name === columnField)?.display_name}`}
                      </>
                    )
                    : (aggregation === 'count' ? 'Contagem' : aggregation === 'sum' ? 'Soma' : aggregation === 'avg' ? 'Média' : 'Valor')
                  }
                </TableHead>
                {pivotData.columns.map((col) => (
                  <TableHead key={col} className="text-right whitespace-nowrap">
                    {col}
                  </TableHead>
                ))}
                <TableHead className="text-right bg-muted/50 font-bold">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Columns-only mode: single row with aggregated values */}
              {pivotData.columnsOnly ? (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="sticky left-0">
                    {selectedTable.columns.find(c => c.name === columnField)?.display_name}
                  </TableCell>
                  {pivotData.columns.map((col) => (
                    <TableCell key={col} className="text-right">
                      {formatValue(getColTotal(col))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">{formatValue(pivotData.grandTotal)}</TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Two-level rows */}
                  {pivotData.hasSecondLevel ? (
                    pivotData.rowStructure.map(({ primary, secondary }) => (
                      <>
                        {/* Primary row */}
                        <TableRow key={primary} className="bg-muted/20">
                          <TableCell className="font-semibold bg-muted/30 sticky left-0">
                            {primary}
                          </TableCell>
                          {pivotData.columns.map((col) => (
                            <TableCell key={col} className="text-right font-medium">
                              {formatValue(getCellValue(primary, col))}
                            </TableCell>
                          ))}
                          <TableCell className="text-right bg-muted/30 font-semibold">
                            {formatValue(getRowTotal(primary))}
                          </TableCell>
                        </TableRow>
                        {/* Secondary rows */}
                        {secondary.map((sec) => {
                          const combinedKey = `${primary}|||${sec}`;
                          return (
                            <TableRow key={combinedKey}>
                              <TableCell className="pl-6 bg-muted/10 sticky left-0 text-muted-foreground">
                                └ {sec}
                              </TableCell>
                              {pivotData.columns.map((col) => (
                                <TableCell key={col} className="text-right">
                                  {formatValue(getCellValue(combinedKey, col))}
                                </TableCell>
                              ))}
                              <TableCell className="text-right bg-muted/10">
                                {formatValue(getRowTotal(combinedKey))}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </>
                    ))
                  ) : (
                    /* Single-level rows */
                    pivotData.rows.map((row) => (
                      <TableRow key={row}>
                        <TableCell className="font-medium bg-muted/30 sticky left-0">
                          {row}
                        </TableCell>
                        {pivotData.columns.map((col) => (
                          <TableCell key={col} className="text-right">
                            {formatValue(getCellValue(row, col))}
                          </TableCell>
                        ))}
                        <TableCell className="text-right bg-muted/30 font-semibold">
                          {formatValue(getRowTotal(row))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Totals row */}
                  {pivotData.columns.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="sticky left-0">Total</TableCell>
                      {pivotData.columns.map((col) => (
                        <TableCell key={col} className="text-right">
                          {formatValue(getColTotal(col))}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">{formatValue(pivotData.grandTotal)}</TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg">
          Selecione Linhas ou Colunas para gerar a tabela dinâmica
        </div>
      )}
    </div>
  );
}
