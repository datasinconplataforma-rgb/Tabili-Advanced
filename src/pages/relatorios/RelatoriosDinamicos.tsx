import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FileText, BarChart3, Table2, GitBranch, RefreshCw, TableProperties, History } from "lucide-react";
import { ModuleSidebarLayout, ModuleMenuItem } from "@/components/ModuleSidebarLayout";
import { useCustomTables, useCustomTableData, CustomDataRow } from "@/hooks/useCustomTables";
import { useAllTablesData } from "@/hooks/useAllTablesData";
import { ProjectFilter } from "@/components/ProjectFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportCharts } from "@/components/relatorios/ReportCharts";
import { PivotTable } from "@/components/relatorios/PivotTable";
import { CrossTabReport } from "@/components/relatorios/CrossTabReport";
import { TabularReport } from "@/components/relatorios/TabularReport";
import ActivityLogsReport from "@/components/relatorios/ActivityLogsReport";
import { supabase } from "@/integrations/supabase/client";

const menuItems: ModuleMenuItem[] = [
  { id: "dinamicos", label: "Relatórios Dinâmicos", icon: BarChart3, href: "/relatorios" },
];

type AggregationType = "count" | "sum" | "avg";

export default function RelatoriosDinamicos() {
  const location = useLocation();
  const { tables, loading: tablesLoading } = useCustomTables();
  const { allTablesData } = useAllTablesData();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState('__all__');
  const [xAxis, setXAxis] = useState<string>("");
  const [yAxis, setYAxis] = useState<string>("");
  const [aggregation, setAggregation] = useState<AggregationType>("count");
  const [chartTitle, setChartTitle] = useState<string>("Relatório");
  const [activeTab, setActiveTab] = useState<string>("graficos");

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

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId),
    [tables, selectedTableId]
  );

  const filteredTables = useMemo(() => {
    if (projectFilter === '__all__') return tables;
    if (projectFilter === '__none__') return tables.filter(t => !t.project_id);
    return tables.filter(t => t.project_id === projectFilter);
  }, [tables, projectFilter]);

  const { data: tableData, loading: dataLoading } = useCustomTableData(selectedTableId, selectedTable?.name);

  // Function to load data for any table (used by CrossTabReport)
  const loadTableData = useCallback(async (tableId: string): Promise<CustomDataRow[]> => {
    const { data, error } = await supabase
      .from("custom_data")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading table data:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      table_id: row.table_id,
      data: (row.data as Record<string, string>) || {},
    }));
  }, []);

  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    setXAxis("");
    setYAxis("");
  };

  return (
    <ModuleSidebarLayout
      moduleName="Relatórios"
      moduleIcon={FileText}
      menuItems={menuItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios Dinâmicos</h1>
          <p className="text-muted-foreground">
            Crie visualizações personalizadas a partir das suas tabelas
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="tabelado" className="gap-2">
              <TableProperties className="h-4 w-4" />
              Tabelado
            </TabsTrigger>
            <TabsTrigger value="graficos" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="dinamico" className="gap-2">
              <Table2 className="h-4 w-4" />
              Dinâmico
            </TabsTrigger>
            <TabsTrigger value="cruzamento" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Cruzamento
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <History className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-6">
            <ActivityLogsReport />
          </TabsContent>

          {/* Cruzamento Tab - Has its own table selectors */}
          <TabsContent value="cruzamento" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cruzamento de Dados</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Compare valores de duas colunas (mesma tabela ou tabelas diferentes)
                </p>
              </CardHeader>
              <CardContent>
                <CrossTabReport
                  tables={tables}
                  loadTableData={loadTableData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Common Table Selector - Only for Gráficos and Dinâmico */}
          {activeTab !== "cruzamento" && activeTab !== "logs" && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Fonte de Dados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label>Projeto</Label>
                    <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
                  </div>
                  <div className="space-y-2 flex-1 max-w-sm">
                    <Label>Tabela</Label>
                    <Select value={selectedTableId || ""} onValueChange={handleTableChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tabela" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab !== "cruzamento" && activeTab !== "logs" && (tablesLoading || dataLoading) && (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {activeTab !== "cruzamento" && activeTab !== "logs" && !tablesLoading && !dataLoading && !selectedTableId && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Selecione uma tabela para começar
            </div>
          )}

          {activeTab !== "cruzamento" && activeTab !== "logs" && selectedTableId && !tablesLoading && !dataLoading && (
            <>
              {/* Gráficos Tab */}
              <TabsContent value="graficos" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Chart Configuration */}
                  <Card className="lg:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-lg">Configurações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Eixo X (Agrupamento)</Label>
                        <Select value={xAxis} onValueChange={setXAxis}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a coluna" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTable?.columns.map((col) => (
                              <SelectItem key={col.id} value={col.name}>
                                {col.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Eixo Y (Valor - opcional)</Label>
                        <Select value={yAxis || "__none__"} onValueChange={(v) => setYAxis(v === "__none__" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Nenhum (contagem)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum (contagem)</SelectItem>
                            {selectedTable?.columns.map((col) => (
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
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Título do Gráfico</Label>
                        <Input
                          value={chartTitle}
                          onChange={(e) => setChartTitle(e.target.value)}
                          placeholder="Título"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Chart Display */}
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle>{chartTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReportCharts
                        selectedTable={selectedTable}
                        tableData={tableData}
                        xAxis={xAxis}
                        yAxis={yAxis}
                        aggregation={aggregation}
                        chartTitle={chartTitle}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Dinâmico Tab (Pivot Table) */}
              <TabsContent value="dinamico" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tabela Dinâmica</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure linhas, colunas, valores e filtros como no Excel
                    </p>
                  </CardHeader>
                  <CardContent>
                    <PivotTable
                      selectedTable={selectedTable}
                      tableData={tableData}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tabelado Tab */}
              <TabsContent value="tabelado" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Relatório Tabelado</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Visualize os dados com filtros e exporte para Excel ou PDF
                    </p>
                  </CardHeader>
                  <CardContent>
                    <TabularReport
                      selectedTable={selectedTable}
                      tableData={tableData}
                      allTablesData={allTablesData}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </ModuleSidebarLayout>
  );
}
