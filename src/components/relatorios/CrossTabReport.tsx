import { useState, useMemo, useEffect } from "react";
import { Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomTable, CustomDataRow } from "@/hooks/useCustomTables";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CrossTabReportProps {
  tables: CustomTable[];
  loadTableData: (tableId: string) => Promise<CustomDataRow[]>;
}

type AggregationType = "count" | "sum" | "value";
type ComparisonType = "difference" | "variation" | "ratio" | "equality" | "sum_total";

export function CrossTabReport({ tables, loadTableData }: CrossTabReportProps) {
  // Source selection
  const [tableAId, setTableAId] = useState<string>("");
  const [tableBId, setTableBId] = useState<string>("__same__");
  
  // Field selection
  const [rowAxisField, setRowAxisField] = useState<string>("");
  const [columnAField, setColumnAField] = useState<string>("");
  const [columnBField, setColumnBField] = useState<string>("");
  const [relationField, setRelationField] = useState<string>("__same__");
  
  // Aggregation and comparison
  const [aggregation, setAggregation] = useState<AggregationType>("count");
  const [comparison, setComparison] = useState<ComparisonType>("difference");
  
  // Data
  const [tableAData, setTableAData] = useState<CustomDataRow[]>([]);
  const [tableBData, setTableBData] = useState<CustomDataRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const tableA = useMemo(() => tables.find(t => t.id === tableAId), [tables, tableAId]);
  const tableB = useMemo(() => {
    if (tableBId === "__same__") return tableA;
    return tables.find(t => t.id === tableBId);
  }, [tables, tableBId, tableA]);

  const isSameTable = tableBId === "__same__";

  // Load data when tables change
  useEffect(() => {
    const fetchData = async () => {
      if (!tableAId) {
        setTableAData([]);
        setTableBData([]);
        return;
      }

      setLoadingData(true);
      try {
        const dataA = await loadTableData(tableAId);
        setTableAData(dataA);

        if (isSameTable) {
          setTableBData(dataA);
        } else if (tableBId && tableBId !== "__same__") {
          const dataB = await loadTableData(tableBId);
          setTableBData(dataB);
        }
      } catch (error) {
        console.error("Error loading table data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [tableAId, tableBId, loadTableData, isSameTable]);

  // Reset fields when table A changes
  useEffect(() => {
    setRowAxisField("");
    setColumnAField("");
    setColumnBField("");
    setRelationField("__same__");
  }, [tableAId]);

  // Reset column B when table B changes
  useEffect(() => {
    if (!isSameTable) {
      setColumnBField("");
      setRelationField("__same__");
    }
  }, [tableBId, isSameTable]);

  // Get columns for table B (for relation field)
  const tableBRelationColumns = useMemo(() => {
    if (!tableB || isSameTable) return [];
    return tableB.columns;
  }, [tableB, isSameTable]);

  // Get valid comparison options based on aggregation type
  const validComparisonOptions = useMemo(() => {
    if (aggregation === "value") {
      return [{ value: "equality", label: "Igualdade (A = B)" }];
    }
    return [
      { value: "equality", label: "Igualdade (A = B)" },
      { value: "difference", label: "Diferença (A - B)" },
      { value: "sum_total", label: "Soma (A + B)" },
    ];
  }, [aggregation]);

  // Reset comparison when aggregation changes to an invalid option
  useMemo(() => {
    const validValues = validComparisonOptions.map(o => o.value);
    if (!validValues.includes(comparison)) {
      setComparison(validComparisonOptions[0].value as ComparisonType);
    }
  }, [aggregation, validComparisonOptions, comparison]);

  // Calculate cross-tab data
  const crossTabData = useMemo(() => {
    if (!rowAxisField || !columnAField || !columnBField) {
      return { rows: [], hasData: false, isValueMode: false };
    }

    const isValueMode = aggregation === "value";

    // Determine the relation field for table B
    const effectiveRelationField = isSameTable 
      ? rowAxisField 
      : (relationField === "__same__" ? rowAxisField : relationField);

    if (isValueMode) {
      // Value mode: display raw values
      const groupedA: Record<string, string[]> = {};
      tableAData.forEach(row => {
        const axisValue = row.data[rowAxisField] || "(vazio)";
        const colValue = String(row.data[columnAField] || "");
        if (!groupedA[axisValue]) groupedA[axisValue] = [];
        if (colValue) groupedA[axisValue].push(colValue);
      });

      const groupedB: Record<string, string[]> = {};
      tableBData.forEach(row => {
        const axisValue = row.data[effectiveRelationField] || "(vazio)";
        const colValue = String(row.data[columnBField] || "");
        if (!groupedB[axisValue]) groupedB[axisValue] = [];
        if (colValue) groupedB[axisValue].push(colValue);
      });

      const allAxisValues = new Set([...Object.keys(groupedA), ...Object.keys(groupedB)]);

      const rows = Array.from(allAxisValues).sort().map(axisValue => {
        const valuesA = groupedA[axisValue] || [];
        const valuesB = groupedB[axisValue] || [];
        const valueAStr = valuesA.join(", ") || "";
        const valueBStr = valuesB.join(", ") || "";
        
        // For equality comparison in value mode
        const isEqual = valueAStr === valueBStr;
        const resultStr = isEqual ? "✓ Igual" : "✗ Diferente";

        return {
          axisValue,
          valueA: 0,
          valueB: 0,
          valueAStr,
          valueBStr,
          result: isEqual ? 1 : 0,
          resultStr,
        };
      });

      const equalCount = rows.filter(r => r.result === 1).length;

      return {
        rows,
        totals: { valueA: 0, valueB: 0, result: 0 },
        totalStr: `${equalCount}/${rows.length} iguais`,
        hasData: rows.length > 0,
        isValueMode: true,
      };
    }

    // Numeric aggregation mode (count, sum)
    const groupedA: Record<string, number[]> = {};
    tableAData.forEach(row => {
      const axisValue = row.data[rowAxisField] || "(vazio)";
      const colValue = row.data[columnAField];
      
      if (!groupedA[axisValue]) groupedA[axisValue] = [];
      
      if (aggregation === "count") {
        groupedA[axisValue].push(1);
      } else {
        const numValue = parseFloat(String(colValue || "0").replace(/[^\d,.-]/g, "").replace(",", "."));
        if (!isNaN(numValue)) {
          groupedA[axisValue].push(numValue);
        }
      }
    });

    const groupedB: Record<string, number[]> = {};
    tableBData.forEach(row => {
      const axisValue = row.data[effectiveRelationField] || "(vazio)";
      const colValue = row.data[columnBField];
      
      if (!groupedB[axisValue]) groupedB[axisValue] = [];
      
      if (aggregation === "count") {
        groupedB[axisValue].push(1);
      } else {
        const numValue = parseFloat(String(colValue || "0").replace(/[^\d,.-]/g, "").replace(",", "."));
        if (!isNaN(numValue)) {
          groupedB[axisValue].push(numValue);
        }
      }
    });

    const allAxisValues = new Set([...Object.keys(groupedA), ...Object.keys(groupedB)]);
    
    const aggregate = (values: number[]): number => {
      if (!values || values.length === 0) return 0;
      return values.reduce((sum, v) => sum + v, 0);
    };

    const rows = Array.from(allAxisValues).sort().map(axisValue => {
      const valueA = aggregate(groupedA[axisValue] || []);
      const valueB = aggregate(groupedB[axisValue] || []);
      
      let result: number;
      let resultStr: string | undefined;
      switch (comparison) {
        case "equality":
          result = valueA === valueB ? 1 : 0;
          resultStr = valueA === valueB ? "✓ Igual" : "✗ Diferente";
          break;
        case "difference":
          result = valueA - valueB;
          break;
        case "sum_total":
          result = valueA + valueB;
          break;
        case "variation":
          result = valueB !== 0 ? ((valueA - valueB) / valueB) * 100 : 0;
          break;
        case "ratio":
          result = valueB !== 0 ? valueA / valueB : 0;
          break;
        default:
          result = 0;
      }
      
      return {
        axisValue,
        valueA,
        valueB,
        result,
        resultStr,
      };
    });

    const totalA = rows.reduce((sum, r) => sum + r.valueA, 0);
    const totalB = rows.reduce((sum, r) => sum + r.valueB, 0);
    let totalResult: number;
    let totalStr: string | undefined;
    switch (comparison) {
      case "equality":
        const equalCount = rows.filter(r => r.result === 1).length;
        totalResult = equalCount;
        totalStr = `${equalCount}/${rows.length} iguais`;
        break;
      case "difference":
        totalResult = totalA - totalB;
        break;
      case "sum_total":
        totalResult = totalA + totalB;
        break;
      case "variation":
        totalResult = totalB !== 0 ? ((totalA - totalB) / totalB) * 100 : 0;
        break;
      case "ratio":
        totalResult = totalB !== 0 ? totalA / totalB : 0;
        break;
      default:
        totalResult = 0;
    }

    return {
      rows,
      totals: { valueA: totalA, valueB: totalB, result: totalResult },
      totalStr,
      hasData: rows.length > 0,
      isValueMode: false,
    };
  }, [rowAxisField, columnAField, columnBField, relationField, aggregation, comparison, tableAData, tableBData, isSameTable]);

  // Format value based on type
  const formatValue = (value: number, isResult: boolean = false, resultStr?: string): string => {
    if (resultStr) return resultStr;
    if (isResult && comparison === "variation") {
      return `${value.toFixed(2)}%`;
    }
    if (isResult && comparison === "ratio") {
      return value.toFixed(2);
    }
    if (aggregation === "count" || aggregation === "value") {
      return value.toLocaleString("pt-BR");
    }
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Get column display names
  const getColumnADisplayName = () => {
    if (!tableA || !columnAField) return "Coluna A";
    return tableA.columns.find(c => c.name === columnAField)?.display_name || columnAField;
  };

  const getColumnBDisplayName = () => {
    if (!tableB || !columnBField) return "Coluna B";
    return tableB.columns.find(c => c.name === columnBField)?.display_name || columnBField;
  };

  const getRowAxisDisplayName = () => {
    if (!tableA || !rowAxisField) return "Eixo";
    return tableA.columns.find(c => c.name === rowAxisField)?.display_name || rowAxisField;
  };

  const getResultLabel = () => {
    switch (comparison) {
      case "equality": return "Resultado";
      case "difference": return "Diferença (A - B)";
      case "sum_total": return "Soma (A + B)";
      case "variation": return "Variação %";
      case "ratio": return "Razão (A / B)";
      default: return "Resultado";
    }
  };

  // Get full header labels with table/column info
  const getColumnAHeader = () => {
    const tableName = tableA?.name || "Tabela A";
    const colName = getColumnADisplayName();
    const aggLabel = aggregation === "count" ? "Contagem" : aggregation === "sum" ? "Soma" : "Valor";
    return `${aggLabel} - ${colName}\n(${tableName})`;
  };

  const getColumnBHeader = () => {
    const tableName = isSameTable ? tableA?.name : tableB?.name;
    const colName = getColumnBDisplayName();
    const aggLabel = aggregation === "count" ? "Contagem" : aggregation === "sum" ? "Soma" : "Valor";
    return `${aggLabel} - ${colName}\n(${tableName || "Tabela B"})`;
  };

  const handleExportPDF = () => {
    if (!crossTabData.hasData) return;

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Relatório de Cruzamento de Dados", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tabela A: ${tableA?.name || "-"} | Coluna: ${getColumnADisplayName()}`, 14, 28);
    doc.text(`Tabela B: ${isSameTable ? "(Mesma tabela)" : tableB?.name || "-"} | Coluna: ${getColumnBDisplayName()}`, 14, 34);
    doc.text(`Agregador: ${aggregation === "count" ? "Contagem" : aggregation === "sum" ? "Soma" : "Exibir Valor"}`, 14, 40);
    doc.text(`Comparação: ${getResultLabel()}`, 14, 46);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 52);
    
    const headers = [
      getRowAxisDisplayName(),
      getColumnADisplayName(),
      getColumnBDisplayName(),
      getResultLabel(),
    ];
    
    const pdfData = crossTabData.rows.map(row => {
      if (crossTabData.isValueMode) {
        return [
          row.axisValue,
          (row as any).valueAStr || "-",
          (row as any).valueBStr || "-",
          row.resultStr || "-",
        ];
      }
      return [
        row.axisValue,
        formatValue(row.valueA),
        formatValue(row.valueB),
        formatValue(row.result, true, row.resultStr),
      ];
    });
    
    // Add totals row
    if (crossTabData.isValueMode) {
      pdfData.push([
        "Total",
        "-",
        "-",
        (crossTabData as any).totalStr || "-",
      ]);
    } else {
      pdfData.push([
        "Total",
        formatValue(crossTabData.totals.valueA),
        formatValue(crossTabData.totals.valueB),
        (crossTabData as any).totalStr || formatValue(crossTabData.totals.result, true),
      ]);
    }
    
    autoTable(doc, {
      head: [headers],
      body: pdfData,
      startY: 58,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    doc.save(`cruzamento_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma tabela disponível
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Select Tables */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
          <h3 className="font-semibold text-foreground">Escolha as Tabelas</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Selecione as duas tabelas que deseja comparar. Pode ser a mesma tabela ou tabelas diferentes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-medium">Tabela A (Origem)</Label>
            <Select value={tableAId} onValueChange={setTableAId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a primeira tabela" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Tabela B (Comparação)</Label>
            <Select value={tableBId} onValueChange={setTableBId} disabled={!tableAId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a segunda tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__same__">Mesma tabela (A)</SelectItem>
                {tables.filter(t => t.id !== tableAId).map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Step 2: Select Columns */}
      {tableAId && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
            <h3 className="font-semibold text-foreground">Escolha o que Comparar</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Defina qual campo agrupa os dados (eixo) e quais colunas serão comparadas.
          </p>
          
          <div className="space-y-4">
            {/* Axis field */}
            <div className="p-3 bg-muted/30 rounded-md space-y-2">
              <Label className="font-medium">Agrupar por (Eixo de Linhas)</Label>
              <p className="text-xs text-muted-foreground">Este campo define como os dados serão agrupados na tabela</p>
              <Select value={rowAxisField} onValueChange={setRowAxisField}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Ex: Cliente, Mês, Categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {tableA?.columns.map((col) => (
                    <SelectItem key={col.id} value={col.name}>
                      {col.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border border-primary/30 bg-primary/5 rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary-foreground px-2 py-0.5 bg-primary rounded">A</span>
                  <Label className="font-medium">Coluna da Tabela A</Label>
                </div>
                <p className="text-xs text-muted-foreground">Coluna com valores a comparar em "{tableA?.name}"</p>
                <Select value={columnAField} onValueChange={setColumnAField}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableA?.columns.map((col) => (
                      <SelectItem key={col.id} value={col.name}>
                        {col.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 border border-accent/50 bg-accent/10 rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-accent-foreground px-2 py-0.5 bg-accent rounded">B</span>
                  <Label className="font-medium">Coluna da Tabela B</Label>
                </div>
                <p className="text-xs text-muted-foreground">Coluna com valores a comparar em "{isSameTable ? tableA?.name : tableB?.name}"</p>
                <Select value={columnBField} onValueChange={setColumnBField} disabled={!tableB}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableB?.columns.map((col) => (
                      <SelectItem key={col.id} value={col.name}>
                        {col.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Relation field for different tables */}
            {!isSameTable && (
              <div className="p-3 bg-muted/30 rounded-md space-y-2">
                <Label className="font-medium">Campo de Relacionamento (Tabela B)</Label>
                <p className="text-xs text-muted-foreground">
                  Como conectar os dados da Tabela B com o eixo? Escolha o campo equivalente.
                </p>
                <Select value={relationField} onValueChange={setRelationField}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Mesmo campo do eixo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__same__">Mesmo campo: {rowAxisField || "eixo"}</SelectItem>
                    {tableBRelationColumns.map((col) => (
                      <SelectItem key={col.id} value={col.name}>
                        {col.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: How to Compare */}
      {tableAId && columnAField && columnBField && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
            <h3 className="font-semibold text-foreground">Como Comparar</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha como os valores serão calculados e comparados.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">Tipo de Cálculo</Label>
              <p className="text-xs text-muted-foreground">Como processar os valores das colunas</p>
              <Select value={aggregation} onValueChange={(v) => setAggregation(v as AggregationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Contagem (quantos itens)</SelectItem>
                  <SelectItem value="sum">Soma (total dos valores)</SelectItem>
                  <SelectItem value="value">Exibir Valor (texto exato)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Tipo de Comparação</Label>
              <p className="text-xs text-muted-foreground">Como comparar A com B</p>
              <Select value={comparison} onValueChange={(v) => setComparison(v as ComparisonType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {validComparisonOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {!isSameTable && crossTabData.hasData && crossTabData.rows.some(r => r.valueA === 0 || r.valueB === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Alguns valores não possuem correspondência entre as tabelas.
          </AlertDescription>
        </Alert>
      )}

      {/* Export Button */}
      {crossTabData.hasData && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      )}

      {/* Results Table */}
      {loadingData ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Carregando dados...
        </div>
      ) : crossTabData.hasData ? (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 font-bold min-w-[120px]">
                  {getRowAxisDisplayName()}
                  <span className="block text-xs font-normal text-muted-foreground">({tableA?.name})</span>
                </TableHead>
                <TableHead className="text-right min-w-[150px]">
                  <div className="flex flex-col items-end">
                    <span>{aggregation === "count" ? "Contagem" : aggregation === "sum" ? "Soma" : "Valor"}</span>
                    <span className="text-xs font-normal text-muted-foreground">{getColumnADisplayName()}</span>
                    <span className="text-xs font-normal text-muted-foreground">({tableA?.name})</span>
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[150px]">
                  <div className="flex flex-col items-end">
                    <span>{aggregation === "count" ? "Contagem" : aggregation === "sum" ? "Soma" : "Valor"}</span>
                    <span className="text-xs font-normal text-muted-foreground">{getColumnBDisplayName()}</span>
                    <span className="text-xs font-normal text-muted-foreground">({isSameTable ? tableA?.name : tableB?.name})</span>
                  </div>
                </TableHead>
                <TableHead className="text-right bg-muted/50 font-bold min-w-[120px]">{getResultLabel()}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossTabData.rows.map((row) => (
                <TableRow key={row.axisValue}>
                  <TableCell className="font-medium">{row.axisValue}</TableCell>
                  <TableCell className="text-right">
                    {crossTabData.isValueMode ? (row as any).valueAStr : formatValue(row.valueA)}
                  </TableCell>
                  <TableCell className="text-right">
                    {crossTabData.isValueMode ? (row as any).valueBStr : formatValue(row.valueB)}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${
                    comparison === "equality" 
                      ? (row.result === 1 ? "text-green-600" : "text-red-600")
                      : (row.result > 0 ? "text-green-600" : row.result < 0 ? "text-red-600" : "")
                  }`}>
                    {row.resultStr || formatValue(row.result, true)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {crossTabData.isValueMode ? "-" : formatValue(crossTabData.totals.valueA)}
                </TableCell>
                <TableCell className="text-right">
                  {crossTabData.isValueMode ? "-" : formatValue(crossTabData.totals.valueB)}
                </TableCell>
                <TableCell className={`text-right ${
                  comparison === "equality" ? "" :
                  crossTabData.totals.result > 0 ? "text-green-600" : crossTabData.totals.result < 0 ? "text-red-600" : ""
                }`}>
                  {(crossTabData as any).totalStr || formatValue(crossTabData.totals.result, true)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg">
          {!tableAId 
            ? "Selecione uma tabela para começar"
            : "Selecione o eixo de linhas e as colunas A e B para gerar o cruzamento"
          }
        </div>
      )}
    </div>
  );
}
