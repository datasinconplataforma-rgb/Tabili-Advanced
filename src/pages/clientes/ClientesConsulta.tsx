import { useCustomTables, useCustomTableData } from '@/hooks/useCustomTables';
import { useAllTablesData } from '@/hooks/useAllTablesData';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, Plus, List, AlertCircle } from 'lucide-react';
import { DynamicSpreadsheet } from '@/components/DynamicSpreadsheet';

const menuItems: ModuleMenuItem[] = [
  { id: "cadastro", label: "Cadastrar Cliente", icon: Plus, href: "/clientes" },
  { id: "consulta", label: "Consultar Clientes", icon: List, href: "/clientes/consulta" },
];

export default function ClientesConsulta() {
  const { tables, loading: tablesLoading } = useCustomTables();
  const { allTablesData, loading: allTablesLoading } = useAllTablesData();

  // Find the "clientes" table (case-insensitive)
  const clientesTable = tables.find(
    (t) => t.name.toLowerCase() === 'clientes'
  );

  const {
    data,
    loading: dataLoading,
    addRow,
    addRowWithData,
    updateRow,
    deleteRow,
    deleteMultipleRows,
  } = useCustomTableData(clientesTable?.id || null, clientesTable?.name);

  return (
    <ModuleSidebarLayout
      moduleName="Clientes"
      moduleIcon={Users}
      menuItems={menuItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultar Clientes</h1>
          <p className="text-muted-foreground">Visualize e gerencie os clientes cadastrados</p>
        </div>

        {tablesLoading || dataLoading || allTablesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !clientesTable ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
              <p className="text-muted-foreground text-center mb-2">
                Tabela "clientes" não encontrada.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Crie uma tabela chamada "clientes" na Gestão de Tabelas para usar este módulo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <DynamicSpreadsheet
            columns={clientesTable.columns}
            data={data}
            onUpdate={updateRow}
            onDelete={deleteRow}
            onDeleteMultiple={deleteMultipleRows}
            onAdd={addRow}
            onAddWithData={addRowWithData}
            tableName="clientes"
            allTablesData={allTablesData}
          />
        )}
      </div>
    </ModuleSidebarLayout>
  );
}