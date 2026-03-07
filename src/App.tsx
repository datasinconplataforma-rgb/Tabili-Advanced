import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ERPDashboard from "./pages/ERPDashboard";
import GestaoTabelas from "./pages/gestao/GestaoTabelas";
import EntradaDadosModule from "./pages/entrada/EntradaDadosModule";
import ConsultaGeral from "./pages/consulta/ConsultaGeral";
import RelatoriosDinamicos from "./pages/relatorios/RelatoriosDinamicos";
import CompartilhamentoModule from "./pages/compartilhamento/CompartilhamentoModule";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PublicForm from "./pages/PublicForm";
import PublicTableView from "./pages/PublicTableView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ERPDashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ERPDashboard />} />
            <Route path="/gestao" element={<GestaoTabelas />} />
            <Route path="/entrada" element={<EntradaDadosModule />} />
            <Route path="/consulta" element={<ConsultaGeral />} />
            <Route path="/relatorios" element={<RelatoriosDinamicos />} />
            <Route path="/compartilhamento" element={<CompartilhamentoModule />} />
            <Route path="/formulario/:token" element={<PublicForm />} />
            <Route path="/visualizar/:token" element={<PublicTableView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
