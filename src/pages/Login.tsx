import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const destination = (location.state as any)?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, destination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo(a) ao Sistema de Armários!");
      navigate(destination, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "E-mail ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="dark min-h-screen bg-[#0f172a] text-slate-100 flex items-center justify-center relative overflow-hidden"
      style={{ colorScheme: "dark" }}
    >
      {/* Decorative blobs */}
      <div className="login-blob w-80 h-80 -top-20 -right-20 fixed opacity-60" />
      <div className="login-blob w-64 h-64 -bottom-16 -left-16 fixed opacity-60" />
      
      {/* Login Card */}
      <div className="w-full max-w-md mx-4 animate-scale-in z-10">
        <div className="bg-[#131c31] rounded-2xl shadow-2xl p-8 border border-slate-800">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 text-primary mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Acesso do Coordenador
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Utilize suas credenciais para acessar o painel de armários.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">E-mail institucional</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@escola.com"
                  className="pl-10 bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#0f172a] [&:-webkit-autofill]:[-webkit-text-fill-color:#f1f5f9]"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Senha de acesso</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#0f172a] [&:-webkit-autofill]:[-webkit-text-fill-color:#f1f5f9]"
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
