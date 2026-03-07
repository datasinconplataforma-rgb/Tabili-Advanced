import { Construction, Users, Package, FileText, List, Plus, Settings } from "lucide-react";
import { ModuleSidebarLayout, ModuleMenuItem } from "@/components/ModuleSidebarLayout";
import { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
}

const moduleConfig: Record<string, { icon: LucideIcon; menuItems: ModuleMenuItem[]; basePath: string }> = {
  "Clientes": {
    icon: Users,
    basePath: "/clientes",
    menuItems: [
      { id: "lista", label: "Lista de Clientes", icon: List, href: "/clientes" },
      { id: "novo", label: "Novo Cliente", icon: Plus, href: "/clientes/novo" },
      { id: "config", label: "Configurações", icon: Settings, href: "/clientes/config" },
    ],
  },
  "Produtos": {
    icon: Package,
    basePath: "/produtos",
    menuItems: [
      { id: "lista", label: "Lista de Produtos", icon: List, href: "/produtos" },
      { id: "novo", label: "Novo Produto", icon: Plus, href: "/produtos/novo" },
      { id: "categorias", label: "Categorias", icon: Settings, href: "/produtos/categorias" },
    ],
  },
  "Relatórios": {
    icon: FileText,
    basePath: "/relatorios",
    menuItems: [
      { id: "vendas", label: "Vendas", icon: FileText, href: "/relatorios/vendas" },
      { id: "estoque", label: "Estoque", icon: Package, href: "/relatorios/estoque" },
      { id: "clientes", label: "Clientes", icon: Users, href: "/relatorios/clientes" },
    ],
  },
};

export default function ComingSoon({ title }: ComingSoonProps) {
  const config = moduleConfig[title] || {
    icon: Construction,
    basePath: "/",
    menuItems: [],
  };

  return (
    <ModuleSidebarLayout
      moduleName={title}
      moduleIcon={config.icon}
      menuItems={config.menuItems}
    >
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">{title}</h1>
        <p className="text-muted-foreground">Este módulo está em desenvolvimento</p>
      </div>
    </ModuleSidebarLayout>
  );
}
