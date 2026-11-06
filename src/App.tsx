import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Alunos from "./pages/Alunos";
import CadastrarAluno from "./pages/CadastrarAluno";
import Armarios from "./pages/Armarios";
import EmprestimoChaves from "./pages/EmprestimoChaves";
import Sorteio from "./pages/Sorteio";
import Turmas from "./pages/Turmas";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache inteligente
      refetchOnWindowFocus: false, // evita requisições desnecessárias ao trocar de aba
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Rotas Protegidas (Exigem Autenticação) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/turmas"
              element={
                <ProtectedRoute>
                  <Turmas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alunos"
              element={
                <ProtectedRoute>
                  <Alunos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alunos/cadastrar"
              element={
                <ProtectedRoute>
                  <CadastrarAluno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/armarios"
              element={
                <ProtectedRoute>
                  <Armarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chaves"
              element={
                <ProtectedRoute>
                  <EmprestimoChaves />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sorteio"
              element={
                <ProtectedRoute>
                  <Sorteio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
