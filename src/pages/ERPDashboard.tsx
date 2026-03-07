import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomTables } from "@/hooks/useCustomTables";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, Loader2, Search, Database, FileInput, BarChart3, Users, FolderKanban, Share2, LayoutGrid } from "lucide-react";
import tabiliLogo from "@/assets/tabili-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BottomNav } from "@/components/dashboard/BottomNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const modules = [
  { title: "Gestão de Tabelas", icon: FolderKanban, href: "/gestao" },
  { title: "Entrada de Dados", icon: FileInput, href: "/entrada" },
  { title: "Consulta", icon: Search, href: "/consulta" },
  { title: "Relatórios", icon: BarChart3, href: "/relatorios" },
  { title: "Compartilhamento", icon: Share2, href: "/compartilhamento" },
];

export default function ERPDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { tables, loading: tablesLoading } = useCustomTables();

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['dashboard-records-count', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, byTable: {} };
      const { data, error } = await supabase.from('custom_data').select('table_id');
      if (error) throw error;
      const byTable: Record<string, number> = {};
      data?.forEach(row => { byTable[row.table_id] = (byTable[row.table_id] || 0) + 1; });
      return { total: data?.length || 0, byTable };
    },
    enabled: !!user,
  });

  const stats = useMemo(() => ({
    totalTables: tables.length,
    ownedTables: tables.filter(t => t.is_owner).length,
    sharedTables: tables.filter(t => !t.is_owner).length,
    totalRecords: recordsData?.total || 0,
  }), [tables, recordsData]);

  const topTables = useMemo(() => {
    if (!recordsData?.byTable || !tables.length) return [];
    return tables
      .map(t => ({ id: t.id, name: t.name, count: recordsData.byTable[t.id] || 0, columns: t.columns.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tables, recordsData]);

  const maxCount = useMemo(() => {
    if (!topTables.length) return 1;
    return Math.max(...topTables.map(t => t.count), 1);
  }, [topTables]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const isLoading = tablesLoading || recordsLoading;
  const userInitial = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      {/* Header - compact on mobile */}
      <header className="border-b border-border px-4 sm:px-6 py-2 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tabiliLogo} alt="Tabili" className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
            <div>
              <span className="font-bold tracking-tight block text-sm sm:text-base">Tabili</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground leading-none">Gestão de Tabelas</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Módulos dropdown - hidden on mobile (replaced by bottom nav) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                  <LayoutGrid className="h-4 w-4" />
                  Módulos
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {modules.map((mod) => (
                  <DropdownMenuItem key={mod.href} asChild>
                    <Link to={mod.href} className="flex items-center gap-2 cursor-pointer">
                      <mod.icon className="h-4 w-4" />
                      {mod.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop: email + logout */}
            <span className="text-sm text-muted-foreground truncate max-w-[200px] hidden sm:block">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden sm:flex">
              <LogOut className="h-4 w-4" />
            </Button>

            {/* Mobile: avatar with dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="sm:hidden">
                <button className="focus:outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Title */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-xs sm:text-base">Visão geral do seu sistema</p>
        </div>

        {/* KPI Grid - 2 cols on mobile, 3 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-category-data/10 flex items-center justify-center shrink-0">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 text-category-data" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold leading-tight">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.totalTables}
                  </p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Tabelas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-category-success/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-category-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold leading-tight">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.totalRecords}
                  </p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Registros</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-category-users/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-category-users" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold leading-tight">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.sharedTables}
                  </p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground">Compartilhadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Tables with progress bars */}
        <div>
          <h2 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-4">Tabelas com mais registros</h2>
          <Card>
            <CardContent className="p-3 sm:pt-4 sm:p-6">
              {isLoading ? (
                <div className="flex justify-center py-4 sm:py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : topTables.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {topTables.map((table, index) => (
                    <Link key={table.id} to={`/consulta?table=${table.id}`} className="block group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-[10px] text-muted-foreground w-3 shrink-0">{index + 1}.</span>
                          <span className="text-xs sm:text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {table.name}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-primary shrink-0 ml-2">{table.count}</span>
                      </div>
                      <Progress value={(table.count / maxCount) * 100} className="h-1.5 sm:h-2" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 sm:py-8">
                  <Database className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Nenhum dado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Bottom Navigation - mobile only */}
      <BottomNav />
    </div>
  );
}
