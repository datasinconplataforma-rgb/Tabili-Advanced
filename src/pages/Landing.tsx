import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Box, Users, FileSpreadsheet } from "lucide-react";
import tabiliLogo from "@/assets/tabili-logo.png";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStart = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tabiliLogo} alt="Tabili" className="h-8 w-8 rounded" />
            <span className="text-xl font-bold tracking-tight text-foreground">Tabili</span>
          </div>
          <Button variant="outline" onClick={handleStart}>
            {user ? "Acessar Sistema" : "Entrar"}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Gestão de Tabelas
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Tabili
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema de gestão de tabelas personalizadas com compartilhamento.
              Crie, organize e colabore em suas tabelas de dados.
            </p>
          </div>

          <Button 
            size="lg" 
            onClick={handleStart}
            className="gap-2 text-base px-8 py-6"
          >
            {user ? "Acessar Dashboard" : "Começar Agora"}
            <ArrowRight className="h-5 w-5" />
          </Button>

          {/* Features */}
          <div className="grid md:grid-cols-4 gap-4 pt-16">
            <div className="p-5 rounded-lg border border-border/50 bg-card/50 space-y-2 text-left">
              <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Gestão de Tabelas</h3>
              <p className="text-sm text-muted-foreground">
                Crie e gerencie tabelas personalizadas
              </p>
            </div>

            <div className="p-5 rounded-lg border border-border/50 bg-card/50 space-y-2 text-left">
              <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Compartilhamento</h3>
              <p className="text-sm text-muted-foreground">
                Compartilhe tabelas com outros usuários
              </p>
            </div>

            <div className="p-5 rounded-lg border border-border/50 bg-card/50 space-y-2 text-left">
              <div className="h-9 w-9 rounded-md bg-secondary flex items-center justify-center">
                <Box className="h-5 w-5 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Entrada de Dados</h3>
              <p className="text-sm text-muted-foreground">
                Adicione dados de forma individual ou em lote
              </p>
            </div>

            <div className="p-5 rounded-lg border border-border/50 bg-card/50 space-y-2 text-left">
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">Relatórios</h3>
              <p className="text-sm text-muted-foreground">
                Análises e relatórios detalhados
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          © 2024 Tabili. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
