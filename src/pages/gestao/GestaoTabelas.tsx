import { useState, useMemo, useEffect } from 'react';
import { useCustomTables, CustomTable } from '@/hooks/useCustomTables';
import { useTableProjects, TableProject, ULTIMAS_CRIADAS_NAME } from '@/hooks/useTableProjects';
import { ModuleSidebarLayout, ModuleMenuItem } from '@/components/ModuleSidebarLayout';
import { ProjectTableActions } from '@/components/gestao/ProjectTableActions';
import { CreateTableDialog } from '@/components/CreateTableDialog';
import { EditTableDialog } from '@/components/EditTableDialog';
import { ShareTableDialog } from '@/components/ShareTableDialog';
import { DuplicateTableDialog } from '@/components/DuplicateTableDialog';
import { ExternalCollectionDialog } from '@/components/ExternalCollectionDialog';
import { TransferOwnershipDialog } from '@/components/TransferOwnershipDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2, FolderOpen, FolderPlus, Table2, Search, Pencil, Trash2,
  FolderKanban, ArrowRightLeft, Inbox, Settings, Share2, Globe, ChevronDown, ChevronUp, Copy, MoreVertical, X
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { BottomNav } from '@/components/dashboard/BottomNav';

const menuItems: ModuleMenuItem[] = [
  { id: "gestao", label: "Gestão de Tabelas", icon: FolderKanban, href: "/gestao" },
];

export default function GestaoTabelas() {
  const { tables, loading: tablesLoading, createTable, deleteTable, renameTable, addColumn, updateColumn, deleteColumn, getColumnDataCount, refetch: refetchTables } = useCustomTables();
  const { projects, loading: projectsLoading, createProject, renameProject, deleteProject, assignTableToProject, ultimasCriadasId } = useTableProjects();

  const [searchFilter, setSearchFilter] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<TableProject | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [moveTableDialog, setMoveTableDialog] = useState<{ tableId: string; tableName: string } | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Table admin states (merged from Administrador)
  const [editingTable, setEditingTable] = useState<CustomTable | null>(null);
  const [unassignedDrawerTable, setUnassignedDrawerTable] = useState<CustomTable | null>(null);
  const [sharingTable, setSharingTable] = useState<CustomTable | null>(null);
  const [duplicatingTable, setDuplicatingTable] = useState<CustomTable | null>(null);
  const [externalCollectionTable, setExternalCollectionTable] = useState<CustomTable | null>(null);
  const [transferringTable, setTransferringTable] = useState<CustomTable | null>(null);

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [previousSearchFilter, setPreviousSearchFilter] = useState('');

  const loading = tablesLoading || projectsLoading;

  const tableMatchesFilter = (table: CustomTable, filter: string): boolean => {
    if (!filter.trim()) return true;
    return table.name.toLowerCase().includes(filter.toLowerCase());
  };

  const projectMatchesFilter = (project: TableProject, filter: string): boolean => {
    if (!filter.trim()) return true;
    return project.name.toLowerCase().includes(filter.toLowerCase());
  };

  const getFilteredTablesForProject = (projectId: string | null) => {
    const projectTables = tables.filter(t => t.project_id === projectId && t.is_owner);
    if (!searchFilter.trim()) return projectTables;
    return projectTables.filter(t => tableMatchesFilter(t, searchFilter));
  };

  const ownedProjects = useMemo(() => {
    const filtered = projects.filter(p => {
      if (!p.is_owner) return false;
      const projectMatches = projectMatchesFilter(p, searchFilter);
      const hasMatchingTables = getFilteredTablesForProject(p.id).length > 0;
      return projectMatches || hasMatchingTables;
    });
    // Sort: "Últimas Criadas" always first, then alphabetical
    return filtered.sort((a, b) => {
      if (a.name === ULTIMAS_CRIADAS_NAME) return -1;
      if (b.name === ULTIMAS_CRIADAS_NAME) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [projects, tables, searchFilter]);

  const sharedProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.is_owner) return false;
      if (!searchFilter.trim()) return true;
      return projectMatchesFilter(p, searchFilter);
    });
  }, [projects, searchFilter]);

  const unassignedTables = useMemo(() => {
    return tables.filter(t => {
      if (!t.is_owner || t.project_id) return false;
      return tableMatchesFilter(t, searchFilter);
    });
  }, [tables, searchFilter]);

  useEffect(() => {
    const wasSearching = previousSearchFilter.trim().length > 0;
    const isSearching = searchFilter.trim().length > 0;
    if (isSearching && !wasSearching) {
      setExpandedProjects(new Set(ownedProjects.map(p => p.id)));
    } else if (!isSearching && wasSearching) {
      setExpandedProjects(new Set());
    }
    setPreviousSearchFilter(searchFilter);
  }, [searchFilter, ownedProjects, previousSearchFilter]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const toggleTable = (tableId: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedProjects(new Set([...ownedProjects.map(p => p.id), ...sharedProjects.map(p => p.id)]));
  };

  const collapseAll = () => {
    setExpandedProjects(new Set());
    setExpandedTables(new Set());
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim());
    setNewProjectName('');
    setCreateDialogOpen(false);
  };

  const handleRenameProject = async () => {
    if (!editingProject || !editProjectName.trim()) return;
    await renameProject(editingProject.id, editProjectName.trim());
    setEditingProject(null);
    setEditProjectName('');
  };

  const handleDeleteProject = async (project: TableProject) => {
    const tablesInProject = getFilteredTablesForProject(project.id);
    const msg = tablesInProject.length > 0
      ? `O projeto "${project.name}" contém ${tablesInProject.length} tabela(s). Ao excluir, elas ficarão sem projeto. Continuar?`
      : `Tem certeza que deseja excluir o projeto "${project.name}"?`;
    if (confirm(msg)) {
      await deleteProject(project.id);
    }
  };

  const handleMoveTable = async () => {
    if (!moveTableDialog) return;
    const projectId = selectedProjectId === '__none__' ? null : selectedProjectId;
    const success = await assignTableToProject(moveTableDialog.tableId, projectId);
    if (success) await refetchTables();
    setMoveTableDialog(null);
    setSelectedProjectId('');
  };

  const openMoveDialog = (tableId: string, tableName: string, currentProjectId: string | null) => {
    setMoveTableDialog({ tableId, tableName });
    setSelectedProjectId(currentProjectId || '__none__');
  };

  const handleCreateTable = async (name: string, columns: { name: string; display_name: string }[]) => {
    const tableId = await createTable(name, columns);
    if (tableId && ultimasCriadasId) {
      await assignTableToProject(tableId, ultimasCriadasId);
      await refetchTables();
    }
    return tableId;
  };

  const handleDeleteTable = async (tableId: string, tableName: string) => {
    if (confirm(`Tem certeza que deseja excluir a tabela "${tableName}"?`)) {
      await deleteTable(tableId);
    }
  };

  const hasAnyProjects = ownedProjects.length > 0 || sharedProjects.length > 0;

  const tableActionProps = {
    onEdit: setEditingTable,
    onDuplicate: setDuplicatingTable,
    onTransfer: setTransferringTable,
    onDelete: handleDeleteTable,
  };

  return (
    <ModuleSidebarLayout moduleName="Gestão de Tabelas" moduleIcon={FolderKanban} menuItems={menuItems}>
      <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0 scroll-smooth">
        {/* Header - compact on mobile */}
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Gestão de Tabelas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Crie, organize e gerencie suas tabelas e projetos</p>
        </div>

        {/* Actions bar - sticky & compact on mobile */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm -mx-4 px-4 sm:-mx-0 sm:px-0 pb-2 pt-1 sm:pt-0 sm:pb-0 sm:static sm:bg-transparent sm:backdrop-blur-none">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            <div className="flex gap-1.5 sm:gap-2">
              <CreateTableDialog onCreateTable={handleCreateTable} />
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline" size="sm" className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-xs sm:text-sm">
                <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Criar Projeto</span>
                <span className="sm:hidden">Projeto</span>
              </Button>
            </div>
            <div className="relative flex-1 min-w-[100px] sm:min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 sm:pl-9 h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
            {hasAnyProjects && (
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={expandAll} className="h-8 w-8 sm:h-9 sm:w-9" title="Expandir tudo">
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={collapseAll} className="h-8 w-8 sm:h-9 sm:w-9" title="Recolher tudo">
                  <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Owned Projects */}
            {ownedProjects.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Meus Projetos ({ownedProjects.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {ownedProjects.map((project) => {
                    const projectTables = getFilteredTablesForProject(project.id);
                    const isExpanded = expandedProjects.has(project.id);
                    const isSearching = searchFilter.trim().length > 0;
                    const isUltimasCriadas = project.name === ULTIMAS_CRIADAS_NAME;
                    
                    return (
                      <Card
                        key={project.id}
                        className={`cursor-pointer transition-all hover:shadow-md active:bg-muted/30 ${isExpanded || isSearching ? 'ring-2 ring-primary col-span-full' : ''} ${isUltimasCriadas ? 'border-primary/40 bg-primary/5' : ''}`}
                        onClick={() => !isSearching && toggleProject(project.id)}
                      >
                        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <FolderOpen className={`h-6 w-6 sm:h-8 sm:w-8 shrink-0 text-primary`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base truncate">{project.name}</CardTitle>
                                {isUltimasCriadas && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                    Auto
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="mt-1">
                                {projectTables.length} tabela(s)
                              </CardDescription>
                            </div>
                            {!isUltimasCriadas && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={() => {
                                    setEditingProject(project);
                                    setEditProjectName(project.name);
                                  }}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Renomear
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteProject(project)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </CardHeader>

                        {(isExpanded || isSearching) && (
                          <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                            {projectTables.length > 0 ? (
                              <div className="space-y-2 border-t pt-3">
                                {projectTables.map((table) => (
                                  <ProjectTableActions
                                    key={table.id}
                                    table={table}
                                    isExpanded={expandedTables.has(table.id)}
                                    onToggle={() => toggleTable(table.id)}
                                    onMove={openMoveDialog}
                                    onShare={setSharingTable}
                                    onExternalCollection={setExternalCollectionTable}
                                    currentProjectId={project.id}
                                    {...tableActionProps}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground border-t pt-3">
                                {searchFilter ? 'Nenhuma tabela corresponde à busca' : 'Nenhuma tabela neste projeto'}
                              </p>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shared Projects */}
            {sharedProjects.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Projetos Compartilhados ({sharedProjects.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sharedProjects.map((project) => {
                    const projectTables = tables.filter(t => t.project_id === project.id && !t.is_owner);
                    const isExpanded = expandedProjects.has(project.id);
                    
                    return (
                      <Card
                        key={project.id}
                        className={`cursor-pointer transition-all hover:shadow-md border-dashed ${isExpanded ? 'ring-2 ring-muted-foreground col-span-full' : ''}`}
                        onClick={() => toggleProject(project.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-8 w-8 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base truncate">{project.name}</CardTitle>
                              <CardDescription className="mt-1">
                                {projectTables.length} tabela(s) compartilhada(s)
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              Compartilhado
                            </Badge>
                          </div>
                        </CardHeader>

                        {isExpanded && (
                          <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
                            {projectTables.length > 0 ? (
                              <div className="space-y-2 border-t pt-3">
                                {projectTables.map((table) => (
                                  <ProjectTableActions
                                    key={table.id}
                                    table={table}
                                    isExpanded={expandedTables.has(table.id)}
                                    onToggle={() => toggleTable(table.id)}
                                    onMove={openMoveDialog}
                                    onShare={setSharingTable}
                                    onExternalCollection={setExternalCollectionTable}
                                    currentProjectId={project.id}
                                    isSharedProject
                                    onEdit={setEditingTable}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground border-t pt-3">
                                Nenhuma tabela compartilhada neste projeto
                              </p>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unassigned Tables */}
            {unassignedTables.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Sem Projeto ({unassignedTables.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {unassignedTables.map((table) => (
                    <Card key={table.id} className="transition-all hover:shadow-md active:bg-muted/30">
                      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Table2 className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground shrink-0" />
                          <CardTitle className="text-sm truncate flex-1 min-w-0">{table.name}</CardTitle>
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 shrink-0">
                            {table.columns.length} col
                          </Badge>
                          {/* Mobile: three-dot menu */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 sm:hidden shrink-0"
                            onClick={() => setUnassignedDrawerTable(table)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Desktop actions */}
                        <div className="hidden sm:flex flex-wrap gap-1.5 pt-2">
                          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => openMoveDialog(table.id, table.name, null)}>
                            <ArrowRightLeft className="h-3.5 w-3.5" /> Mover
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => setEditingTable(table)}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => setDuplicatingTable(table)}>
                            <Copy className="h-3.5 w-3.5" /> Duplicar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => setSharingTable(table)}>
                            <Share2 className="h-3.5 w-3.5" /> Compartilhar
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => setExternalCollectionTable(table)}>
                            <Globe className="h-3.5 w-3.5" /> Coleta
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1 h-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTable(table.id, table.name)}>
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </Button>
                        </div>
                        {/* Mobile: primary actions */}
                        <div className="flex gap-1.5 pt-2 sm:hidden">
                          <Button variant="default" size="sm" className="gap-1 text-xs h-8 flex-1 rounded-lg" onClick={() => openMoveDialog(table.id, table.name, null)}>
                            <ArrowRightLeft className="h-3.5 w-3.5" /> Mover
                          </Button>
                          <Button variant="default" size="sm" className="gap-1 text-xs h-8 flex-1 rounded-lg" onClick={() => setEditingTable(table)}>
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {ownedProjects.length === 0 && sharedProjects.length === 0 && unassignedTables.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {searchFilter ? 'Nenhum resultado encontrado para a busca.' : 'Nenhum projeto ou tabela criado ainda.'}
                    <br />
                    {!searchFilter && 'Clique em "Criar Nova Tabela" ou "Criar Projeto" para começar.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* All Dialogs */}
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
        onTransferred={() => refetchTables()}
      />

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Nome do Projeto</Label>
              <Input
                id="project-name"
                placeholder="Ex: Marketing, Financeiro, RH..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Novo Nome</Label>
              <Input
                id="edit-project-name"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>Cancelar</Button>
            <Button onClick={handleRenameProject} disabled={!editProjectName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Table Dialog */}
      <Dialog open={!!moveTableDialog} onOpenChange={() => setMoveTableDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Tabela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Mover <strong>{moveTableDialog?.tableName}</strong> para:
            </p>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem Projeto</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTableDialog(null)}>Cancelar</Button>
            <Button onClick={handleMoveTable}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Sheet for unassigned table actions (mobile) */}
      <Drawer open={!!unassignedDrawerTable} onOpenChange={(open) => !open && setUnassignedDrawerTable(null)}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base">{unassignedDrawerTable?.name}</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          {unassignedDrawerTable && (
            <div className="px-4 pb-6 space-y-1">
              {[
                { label: 'Mover p/ Projeto', icon: ArrowRightLeft, action: () => { openMoveDialog(unassignedDrawerTable.id, unassignedDrawerTable.name, null); setUnassignedDrawerTable(null); } },
                { label: 'Editar Colunas', icon: Pencil, action: () => { setEditingTable(unassignedDrawerTable); setUnassignedDrawerTable(null); } },
                { label: 'Duplicar', icon: Copy, action: () => { setDuplicatingTable(unassignedDrawerTable); setUnassignedDrawerTable(null); } },
                { label: 'Compartilhar', icon: Share2, action: () => { setSharingTable(unassignedDrawerTable); setUnassignedDrawerTable(null); } },
                { label: 'Coleta Externa', icon: Globe, action: () => { setExternalCollectionTable(unassignedDrawerTable); setUnassignedDrawerTable(null); } },
                { label: 'Excluir', icon: Trash2, action: () => { handleDeleteTable(unassignedDrawerTable.id, unassignedDrawerTable.name); setUnassignedDrawerTable(null); }, destructive: true },
              ].map((item, i) => (
                <button
                  key={i}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted/80 ${
                    item.destructive ? 'text-destructive' : 'text-foreground'
                  }`}
                  onClick={item.action}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </ModuleSidebarLayout>
  );
}
