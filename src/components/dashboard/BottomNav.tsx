import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { List, FileInput, Search, Menu, BarChart3, Share2, FileText, Database, FolderKanban, X, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CreateFormWizard } from "./CreateFormWizard";
import { ShareWizard } from "./ShareWizard";

const navItems = [
  { label: "Tabelas", icon: List, href: "/gestao" },
  { label: "Entrada", icon: FileInput, href: "/entrada", fab: true },
  { label: "Consulta", icon: Search, href: "/consulta" },
];

const menuActions = [
  { label: "Criar Tabela", icon: Table2, href: "/gestao", state: { openCreateTable: true }, description: "Nova tabela de dados" },
  { label: "Criar Formulário", icon: FileText, isWizard: true, description: "Formulário externo de coleta" },
  { label: "Coletar Dados", icon: Database, isWizard: true, wizardType: "form", description: "Criar formulário de coleta" },
  { label: "Compartilhar", icon: Share2, isWizard: true, wizardType: "share", description: "Compartilhar tabela com usuários" },
];

const menuModules = [
  { label: "Dashboard", icon: FolderKanban, href: "/dashboard" },
  { label: "Gestão de Tabelas", icon: List, href: "/gestao" },
  { label: "Entrada de Dados", icon: FileInput, href: "/entrada" },
  { label: "Consulta Geral", icon: Search, href: "/consulta" },
  { label: "Relatórios", icon: BarChart3, href: "/relatorios" },
  { label: "Compartilhamento", icon: Share2, href: "/compartilhamento" },
];

export function BottomNav() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [formWizardOpen, setFormWizardOpen] = useState(false);
  const [shareWizardOpen, setShareWizardOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm sm:hidden">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
            const isFab = (item as any).fab;

            if (isFab) {
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center justify-center -mt-5"
                >
                  <div className={cn(
                    "flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95",
                    isActive && "ring-2 ring-primary/30 ring-offset-2 ring-offset-card"
                  )}>
                    <item.icon className="h-5 w-5 stroke-[2.5]" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors text-muted-foreground"
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="sm:hidden rounded-t-2xl px-4 pb-8 pt-2">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Menu</SheetTitle>
          </SheetHeader>

          {/* Quick Actions */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Ações rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              {menuActions.map((action) => {
                const act = action as any;
                if (act.isWizard) {
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        setMenuOpen(false);
                        setTimeout(() => {
                          if (act.wizardType === "share") {
                            setShareWizardOpen(true);
                          } else {
                            setFormWizardOpen(true);
                          }
                        }, 300);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-3 text-center transition-colors active:bg-muted"
                    >
                      <action.icon className="h-5 w-5 text-primary" />
                      <span className="text-[11px] font-medium leading-tight">{action.label}</span>
                    </button>
                  );
                }
                return (
                  <Link
                    key={action.label}
                    to={act.href}
                    state={act.state}
                    onClick={() => setMenuOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-3 text-center transition-colors active:bg-muted"
                  >
                    <action.icon className="h-5 w-5 text-primary" />
                    <span className="text-[11px] font-medium leading-tight">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* All Modules */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Módulos</p>
            <div className="space-y-0.5">
              {menuModules.map((mod) => {
                const isActive = location.pathname === mod.href ||
                  (mod.href !== "/dashboard" && location.pathname.startsWith(mod.href));
                return (
                  <Link
                    key={mod.label}
                    to={mod.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground active:bg-muted"
                    )}
                  >
                    <mod.icon className="h-4.5 w-4.5" />
                    <span className="text-sm">{mod.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateFormWizard open={formWizardOpen} onOpenChange={setFormWizardOpen} />
      <ShareWizard open={shareWizardOpen} onOpenChange={setShareWizardOpen} />
    </>
  );
}