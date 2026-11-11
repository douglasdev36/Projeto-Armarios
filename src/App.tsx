import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Alunos = lazy(() => import("./pages/Alunos"));
const CadastrarAluno = lazy(() => import("./pages/CadastrarAluno"));
const Armarios = lazy(() => import("./pages/Armarios"));
const EmprestimoChaves = lazy(() => import("./pages/EmprestimoChaves"));
const Sorteio = lazy(() => import("./pages/Sorteio"));
const Turmas = lazy(() => import("./pages/Turmas"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Carregando página...</p>
    </div>
  </div>
);

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
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
