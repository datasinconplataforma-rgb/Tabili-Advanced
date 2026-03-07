import { useState, useMemo } from "react";
import { BarChart3, PieChart, LineChart, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CustomTable } from "@/hooks/useCustomTables";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(30, 70%, 50%)",
];

type ChartType = "bar" | "pie" | "line";
type AggregationType = "count" | "sum" | "avg";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercentage = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

interface ReportChartsProps {
  selectedTable: CustomTable | undefined;
  tableData: { id: string; table_id: string; data: Record<string, string> }[];
  xAxis: string;
  yAxis: string;
  aggregation: AggregationType;
  chartTitle: string;
}

export function ReportCharts({
  selectedTable,
  tableData,
  xAxis,
  yAxis,
  aggregation,
  chartTitle,
}: ReportChartsProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");

  const yAxisColumn = useMemo(
    () => selectedTable?.columns.find((c) => c.name === yAxis),
    [selectedTable, yAxis]
  );

  const columnType = yAxisColumn?.column_type as string | undefined;
  const isYAxisCurrency = columnType === 'currency';
  const isYAxisPercentage = columnType === 'percentage';

  const formatValue = (value: number, forceCount = false) => {
    if (forceCount || aggregation === 'count') {
      return value.toString();
    }
    if (isYAxisCurrency) return formatCurrency(value);
    if (isYAxisPercentage) return formatPercentage(value);
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const processedData = useMemo(() => {
    if (!tableData.length || !xAxis) return [];

    const grouped: Record<string, { count: number; sum: number; values: number[] }> = {};

    tableData.forEach((row) => {
      const xValue = row.data[xAxis] || "(vazio)";
      const yValue = yAxis ? parseFloat(String(row.data[yAxis]).replace(/\./g, '').replace(',', '.')) || 0 : 1;

      if (!grouped[xValue]) {
        grouped[xValue] = { count: 0, sum: 0, values: [] };
      }
      grouped[xValue].count += 1;
      grouped[xValue].sum += yValue;
      grouped[xValue].values.push(yValue);
    });

    return Object.entries(grouped).map(([name, data]) => ({
      name,
      count: data.count,
      sum: data.sum,
      avg: data.values.length ? data.sum / data.values.length : 0,
      value: aggregation === "count" ? data.count : aggregation === "sum" ? data.sum : data.values.length ? data.sum / data.values.length : 0,
    }));
  }, [tableData, xAxis, yAxis, aggregation]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    processedData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    config.value = { label: aggregation === "count" ? "Quantidade" : aggregation === "sum" ? "Soma" : "Média", color: "hsl(var(--primary))" };
    return config;
  }, [processedData, aggregation]);

  const handleExportPDF = () => {
    if (!processedData.length || !selectedTable) return;

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(chartTitle, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tabela: ${selectedTable.name} | Agrupamento: ${xAxis}${yAxis ? ` | Valor: ${yAxis}` : ''}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);
    
    const headers = [xAxis || "Categoria", "Quantidade"];
    if (yAxis) {
      headers.push("Soma", "Média");
    }
    
    const pdfTableData = processedData.map((row) => {
      const rowData = [row.name, row.count.toString()];
      if (yAxis) {
        rowData.push(formatValue(row.sum), formatValue(row.avg));
      }
      return rowData;
    });
    
    const totals = ["Total", processedData.reduce((acc, r) => acc + r.count, 0).toString()];
    if (yAxis) {
      const totalSum = processedData.reduce((acc, r) => acc + r.sum, 0);
      const totalCount = processedData.reduce((acc, r) => acc + r.count, 0);
      totals.push(formatValue(totalSum), formatValue(totalSum / totalCount || 0));
    }
    pdfTableData.push(totals);
    
    autoTable(doc, {
      head: [headers],
      body: pdfTableData,
      startY: 42,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    doc.save(`${chartTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const renderChart = () => {
    if (!processedData.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Configure os eixos para gerar o gráfico
        </div>
      );
    }

    switch (chartType) {
      case "bar":
        return (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--foreground))" }} />
              <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        );

      case "line":
        return (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <RechartsLineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--foreground))" }} />
              <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </RechartsLineChart>
          </ChartContainer>
        );

      case "pie":
        return (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <RechartsPieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={processedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {processedData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </RechartsPieChart>
          </ChartContainer>
        );


      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {processedData.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          )}
        </div>
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <TabsList>
            <TabsTrigger value="bar" className="gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Barras</span>
            </TabsTrigger>
            <TabsTrigger value="line" className="gap-1">
              <LineChart className="h-4 w-4" />
              <span className="hidden sm:inline">Linha</span>
            </TabsTrigger>
            <TabsTrigger value="pie" className="gap-1">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Pizza</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {renderChart()}

      {/* Summary Cards */}
      {processedData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-2xl font-bold">{processedData.length}</div>
            <p className="text-xs text-muted-foreground">Categorias</p>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-2xl font-bold">
              {processedData.reduce((acc, r) => acc + r.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de Registros</p>
          </div>
          {yAxis && (
            <>
              <div className="p-4 border rounded-lg bg-card">
                <div className="text-2xl font-bold">
                  {formatValue(processedData.reduce((acc, r) => acc + r.sum, 0))}
                </div>
                <p className="text-xs text-muted-foreground">Soma Total</p>
              </div>
              <div className="p-4 border rounded-lg bg-card">
                <div className="text-2xl font-bold">
                  {formatValue(processedData.reduce((acc, r) => acc + r.sum, 0) / processedData.reduce((acc, r) => acc + r.count, 0) || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Média Geral</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
