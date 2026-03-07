import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LucideIcon, Home, LogOut, Table2, FileInput, Search, BarChart3, FolderKanban, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import tabiliLogo from "@/assets/tabili-logo.png";

export interface ModuleMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

interface ModuleSidebarLayoutProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  menuItems: ModuleMenuItem[];
  children: ReactNode;
}

const moduleLinks = [
  { id: "gestao", label: "Gestão de Tabelas", icon: FolderKanban, href: "/gestao" },
  { id: "entrada", label: "Entrada de Dados", icon: FileInput, href: "/entrada" },
  { id: "consulta", label: "Consulta", icon: Search, href: "/consulta" },
  { id: "relatorios", label: "Relatórios", icon: BarChart3, href: "/relatorios" },
  { id: "compartilhamento", label: "Compartilhamento", icon: Share2, href: "/compartilhamento" },
];

export function ModuleSidebarLayout({ 
  moduleName, 
  moduleIcon: ModuleIcon, 
  menuItems,
  children 
}: ModuleSidebarLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isModuleActive = (href: string) => location.pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          {/* Logo and Module Name */}
          <div className="flex items-center gap-2">
            <img src={tabiliLogo} alt="Tabili" className="h-8 w-8 rounded" />
            <div>
              <span className="font-bold text-sm tracking-tight block">{moduleName}</span>
              <span className="text-xs text-muted-foreground">Tabili</span>
            </div>
          </div>

          {/* Navigation Icons */}
          <TooltipProvider delayDuration={100}>
            <nav className="flex items-center gap-1 ml-4 border-l border-border pl-4">
              {/* Home Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/dashboard">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Home className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Dashboard</p>
                </TooltipContent>
              </Tooltip>

              {/* Module Navigation */}
              {moduleLinks.map((module) => {
                const Icon = module.icon;
                const isActive = isModuleActive(module.href);
                return (
                  <Tooltip key={module.id}>
                    <TooltipTrigger asChild>
                      <Link to={module.href}>
                        <Button 
                          variant={isActive ? "default" : "ghost"} 
                          size="icon" 
                          className="h-9 w-9"
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{module.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
