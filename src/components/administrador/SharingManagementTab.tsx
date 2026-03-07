"use client";

import { useState } from 'react';
import { useAllShares } from '@/hooks/useAllShares';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Search,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Table2,
  Users,
  Share2,
  Trash2,
  Loader2,
  Eye,
  PencilLine,
  BarChart3,
} from 'lucide-react';

export function SharingManagementTab() {
  const { loading, stats, byProject, byTable, updatePermission, removeShare } = useAllShares();
  const [search, setSearch] = useState('');
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
  const [openTables, setOpenTables] = useState<Set<string>>(new Set());

  const toggleProject = (id: string) => {
    setOpenProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTable = (id: string) => {
    setOpenTables(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const lowerSearch = search.toLowerCase();

  // Filter by project
  const filteredProjects = byProject
    .map(project => {
      const emailEntries = Array.from(project.emails.entries());
      const filteredEmails = emailEntries.filter(([email, data]) =>
        !lowerSearch ||
        email.toLowerCase().includes(lowerSearch) ||
        project.project_name.toLowerCase().includes(lowerSearch) ||
        data.tables.some(t => t.tableName.toLowerCase().includes(lowerSearch))
      );
      if (filteredEmails.length === 0 && lowerSearch) return null;
      return { ...project, filteredEmails };
    })
    .filter(Boolean) as (typeof byProject[number] & { filteredEmails: [string, { tables: { shareId: string; tableName: string; tableId: string; permission: 'view' | 'edit' }[] }][] })[];

  // Filter by table (active shares)
  const filteredSharesByTable = byTable.filter(table =>
    !lowerSearch ||
    table.table_name.toLowerCase().includes(lowerSearch) ||
    (table.project_name && table.project_name.toLowerCase().includes(lowerSearch)) ||
    table.shares.some(s => s.email.toLowerCase().includes(lowerSearch))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-none bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Table2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTables}</p>
              <p className="text-xs text-muted-foreground">Tabelas compartilhadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários com acesso</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalShares}</p>
              <p className="text-xs text-muted-foreground">Compartilhamentos ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar email ou tabela..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Níveis de Acesso
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Para iniciar novos compartilhamentos, utilize o módulo de <strong>Gestão de Tabelas</strong>.
          </p>
        </div>

        {stats.totalShares === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum compartilhamento ativo encontrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* By Project */}
            {filteredProjects.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Acesso por Projeto
                </h3>
                <div className="space-y-3">
                  {filteredProjects.map(project => {
                    const isOpen = openProjects.has(project.project_id);
                    const emailEntries = project.filteredEmails ?? Array.from(project.emails.entries());
                    const uniqueEmails = new Set(emailEntries.map(([e]) => e));
                    const uniqueTables = new Set(emailEntries.flatMap(([, d]) => d.tables.map(t => t.tableId)));

                    return (
                      <Collapsible key={project.project_id} open={isOpen} onOpenChange={() => toggleProject(project.project_id)}>
                        <Card className="shadow-sm overflow-hidden">
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                              <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                              <span className="font-medium text-left flex-1 truncate">{project.project_name}</span>
                              <div className="hidden sm:flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">{uniqueTables.size} tabelas</Badge>
                                <Badge variant="outline" className="text-[10px]">{uniqueEmails.size} usuários</Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-0 overflow-x-auto">
                              <table className="w-full min-w-[600px]">
                                <thead className="bg-muted/30">
                                  <tr className="text-[11px] text-muted-foreground uppercase tracking-wider">
                                    <th className="text-left py-2 px-4 font-semibold">Email</th>
                                    <th className="text-left py-2 px-4 font-semibold">Tabelas e Permissões</th>
                                    <th className="text-right py-2 px-4 font-semibold">Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emailEntries.map(([email, data]) => (
                                    <tr key={email} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                                      <td className="py-3 px-4 text-sm font-medium">{email}</td>
                                      <td className="py-3 px-4">
                                        <div className="flex flex-wrap gap-1.5">
                                          {data.tables.map(t => (
                                            <Badge key={t.shareId} variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-5">
                                              {t.permission === 'edit' ? <PencilLine className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                                              {t.tableName}
                                            </Badge>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Remover acesso?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Remover todos os compartilhamentos de <strong>{email}</strong> no projeto <strong>{project.project_name}</strong>?
                                                Isso revogará acesso a {data.tables.length} tabela(s).
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={async () => {
                                                  for (const t of data.tables) {
                                                    await removeShare(t.shareId);
                                                  }
                                                }}
                                              >
                                                Remover
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Acesso por Tabela
              </h3>
              <div className="space-y-3">
                {filteredSharesByTable.map(table => {
                  const isOpen = openTables.has(table.table_id);
                  return (
                    <Collapsible key={table.table_id} open={isOpen} onOpenChange={() => toggleTable(table.table_id)}>
                      <Card className="shadow-sm overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                            <Table2 className="h-5 w-5 text-primary shrink-0" />
                            <span className="font-medium text-left flex-1 truncate">{table.table_name}</span>
                            {table.project_name && (
                              <Badge variant="outline" className="text-[10px] shrink-0 hidden xs:inline-flex">{table.project_name}</Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] shrink-0">{table.shares.length} usuários</Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t p-0 overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                              <thead className="bg-muted/30">
                                <tr className="text-[11px] text-muted-foreground uppercase tracking-wider">
                                  <th className="text-left py-2 px-4 font-semibold">Email</th>
                                  <th className="text-left py-2 px-4 font-semibold">Permissão</th>
                                  <th className="text-right py-2 px-4 font-semibold">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {table.shares.map(share => (
                                  <tr key={share.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium">{share.email}</td>
                                    <td className="py-3 px-4">
                                      <Select
                                        value={share.permission}
                                        onValueChange={(value) => updatePermission(share.id, value as 'view' | 'edit')}
                                      >
                                        <SelectTrigger className="w-[140px] h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="view">
                                            <span className="flex items-center gap-1.5">
                                              <Eye className="h-3 w-3" /> Visualização
                                            </span>
                                          </SelectItem>
                                          <SelectItem value="edit">
                                            <span className="flex items-center gap-1.5">
                                              <PencilLine className="h-3 w-3" /> Edição
                                            </span>
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Remover compartilhamento?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Remover o acesso de <strong>{share.email}</strong> à tabela <strong>{table.table_name}</strong>?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              onClick={() => removeShare(share.id)}
                                            >
                                              Remover
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}