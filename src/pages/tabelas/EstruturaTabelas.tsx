import { useState, useMemo } from 'react';
import { useCustomTables, CustomTable } from '@/hooks/useCustomTables';
import { CreateTableDialog } from '@/components/CreateTableDialog';
import { EditTableDialog } from '@/components/EditTableDialog';
import { ShareTableDialog } from '@/components/ShareTableDialog';
import { DuplicateTableDialog } from '@/components/DuplicateTableDialog';
import { ExternalCollectionDialog } from '@/components/ExternalCollectionDialog';
import { TransferOwnershipDialog } from '@/components/TransferOwnershipDialog';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { Loader2, Trash2, Table2, Database, Search, Pencil, Share2, Users, Eye, PencilLine, Copy, Shield, ArrowRightLeft, ShieldCheck } from 'lucide-react';

const menuItems: ModuleMenuItem[] = [
  { id: "estrutura", label: "Administrador", icon: Shield, href: "/tabelas" },
];

export default function EstruturaTabelas() {
  const { tables, loading, createTable, deleteTable, renameTable, addColumn, updateColumn, deleteColumn, getColumnDataCount, refetch } = useCustomTables();
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [editingTable, setEditingTable] = useState<CustomTable | null>(null);
  const [sharingTable, setSharingTable] = useState<CustomTable | null>(null);
  const [duplicatingTable, setDuplicatingTable] = useState<CustomTable | null>(null);
  const [externalCollectionTable, setExternalCollectionTable] = useState<CustomTable | null>(null);
  const [transferringTable, setTransferringTable] = useState<CustomTable | null>(null);

  const { ownedTables, sharedTables } = useMemo(() => {
    const sorted = [...tables].sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    
    const filtered = searchFilter.trim() 
      ? sorted.filter(table => 
          table.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          table.columns.some(col => 
            col.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
            col.display_name.toLowerCase().includes(searchFilter.toLowerCase())
          )
        )
      : sorted;
    
    return {
      ownedTables: filtered.filter(t => t.is_owner),
      sharedTables: filtered.filter(t => !t.is_owner),
    };
  }, [tables, searchFilter]);

  const allFilteredTables = [...ownedTables, ...sharedTables];

  const toggleTable = (tableId: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTables(new Set(allFilteredTables.map(t => t.id)));
  };

  const collapseAll = () => {
    setExpandedTables(new Set());
  };

  const handleCreateTable = async (name: string, columns: { name: string; display_name: string }[]) => {
    const tableId = await createTable(name, columns);
    return tableId;
  };

  const handleDeleteTable = async (tableId: string, tableName: string) => {
    if (confirm(`Tem certeza que deseja excluir a tabela "${tableName}"?`)) {
      await deleteTable(tableId);
    }
  };

  return (
    <ModuleSidebarLayout
      moduleName="Administrador"
      moduleIcon={Shield}
      menuItems={menuItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administrador</h1>
          <p className="text-muted-foreground">Gerencie a estrutura das suas tabelas personalizadas</p>
        </div>

        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <CreateTableDialog onCreateTable={handleCreateTable} />
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar tabelas..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              {allFilteredTables.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expandir Todas
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Recolher Todas
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allFilteredTables.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {searchFilter ? 'Nenhuma tabela encontrada com o filtro atual.' : 'Nenhuma tabela criada ainda.'}
                    <br />
                    {!searchFilter && 'Clique em "Criar Nova Tabela" para começar.'}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {ownedTables.map((table) => (
                        <Card 
                          key={table.id} 
                          className={`cursor-pointer transition-all hover:shadow-md ${expandedTables.has(table.id) ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => toggleTable(table.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <Table2 className="h-8 w-8 text-primary shrink-0" />
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base truncate">{table.name}</CardTitle>
                                <CardDescription className="mt-1">{table.columns.length} coluna(s)</CardDescription>
                              </div>
                              {table.share_count && table.share_count > 0 && (
                                <Badge variant="outline" className="text-xs gap-1 shrink-0">
                                  <Users className="h-3 w-3" />
                                  {table.share_count}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>

                          {expandedTables.has(table.id) && (
                            <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => setDuplicatingTable(table)}>
                                  <Copy className="h-4 w-4" /> Duplicar
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingTable(table)}>
                                  <Pencil className="h-4 w-4" /> Editar
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => setSharingTable(table)}>
                                  <Share2 className="h-4 w-4" /> Compartilhar
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => setTransferringTable(table)}>
                                  <ArrowRightLeft className="h-4 w-4" /> Transferir
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleDeleteTable(table.id, table.name)}>
                                  <Trash2 className="h-4 w-4" /> Excluir
                                </Button>
                              </div>
                            </CardContent>
                          )}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {sharedTables.map((table) => (
                        <Card
                          key={table.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${expandedTables.has(table.id) ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => toggleTable(table.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Table2 className="h-8 w-8 text-primary shrink-0" />
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full border p-0.5">
                                  <Users className="h-2.5 w-2.5 text-muted-foreground" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <CardTitle className="text-base truncate">{table.name}</CardTitle>
                                    <Badge variant="secondary" className="text-[10px] h-4 py-0 gap-1 shrink-0">
                                      {table.permission === 'admin' ? <ShieldCheck className="h-3 w-3" /> : table.permission === 'edit' ? <PencilLine className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      {table.permission === 'admin' ? 'Administrador' : table.permission === 'edit' ? 'Editor' : 'Visualizador'}
                                    </Badge>
                                </div>
                                {table.shared_by_email && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 w-fit max-w-full">
                                    <Users className="h-2.5 w-2.5" />
                                    <span className="truncate" title={table.shared_by_email}>{table.shared_by_email}</span>
                                  </div>
                                )}
                                <CardDescription className="mt-1">{table.columns.length} coluna(s)</CardDescription>
                              </div>
                            </div>
                          </CardHeader>

                          {expandedTables.has(table.id) && (
                            <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap gap-2">
                                {table.permission === 'view' ? (
                                  <Badge variant="secondary">Somente visualização</Badge>
                                ) : table.permission === 'admin' ? (
                                  <>
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingTable(table)}>
                                      <Pencil className="h-4 w-4" /> Editar
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setSharingTable(table)}>
                                      <Share2 className="h-4 w-4" /> Compartilhar
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setDuplicatingTable(table)}>
                                      <Copy className="h-4 w-4" /> Duplicar
                                    </Button>
                                  </>
                                ) : (
                                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingTable(table)}>
                                    <Pencil className="h-4 w-4" /> Editar
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        <EditTableDialog
          table={editingTable}
          isOpen={!!editingTable}
          onClose={() => setEditingTable(null)}
          onRenameTable={renameTable}
          onAddColumn={addColumn}
          onUpdateColumn={updateColumn}
          onDeleteColumn={deleteColumn}
          getColumnDataCount={getColumnDataCount}
        />

        <ShareTableDialog
          table={sharingTable}
          isOpen={!!sharingTable}
          onClose={() => setSharingTable(null)}
        />

        <DuplicateTableDialog
          table={duplicatingTable}
          isOpen={!!duplicatingTable}
          onClose={() => setDuplicatingTable(null)}
          existingTableNames={tables.map(t => t.name)}
          onDuplicate={createTable}
        />

        <ExternalCollectionDialog
          tableId={externalCollectionTable?.id || null}
          tableName={externalCollectionTable?.name || ''}
          isOpen={!!externalCollectionTable}
          onClose={() => setExternalCollectionTable(null)}
        />

        <TransferOwnershipDialog
          table={transferringTable}
          isOpen={!!transferringTable}
          onClose={() => setTransferringTable(null)}
          onTransferred={() => refetch()}
        />
      </div>
    </ModuleSidebarLayout>
  );
}