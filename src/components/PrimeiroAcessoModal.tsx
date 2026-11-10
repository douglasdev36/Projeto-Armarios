import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Lock, Mail, User, Eye, EyeOff } from "lucide-react";

interface PrimeiroAcessoModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PrimeiroAcessoModal({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: PrimeiroAcessoModalProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;
  const setIsOpen = isControlled ? externalOnOpenChange! : setInternalOpen;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Se o usuário estiver usando as credenciais padrão de fábrica, abre automaticamente no primeiro login se não dispensado nesta sessão
  useEffect(() => {
    if (!isControlled && user?.email === "coordenador@escola.com") {
      const dismissed = sessionStorage.getItem("primeiro_acesso_dismissed");
      if (!dismissed) {
        setInternalOpen(true);
      }
    }
  }, [user, isControlled]);

  useEffect(() => {
    if (user) {
      setNome(user.nome === "Coordenador Pedagógico" ? "" : user.nome);
      setEmail(user.email === "coordenador@escola.com" ? "" : user.email);
    }
  }, [user]);

  const handleDismiss = () => {
    sessionStorage.setItem("primeiro_acesso_dismissed", "true");
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome.",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, informe um endereço de e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A confirmação de senha não coincide com a nova senha digitada.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await api.updateProfile({
        nome: nome.trim(),
        email: email.trim(),
        newPassword,
      });

      updateUser(res.user, res.token);
      sessionStorage.setItem("primeiro_acesso_dismissed", "true");

      toast({
        title: "✨ Conta personalizada com sucesso!",
        description: `Seus dados de acesso foram atualizados. Bem-vindo(a), ${res.user.nome}!`,
      });

      setIsOpen(false);
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar credenciais",
        description: err.message || "Não foi possível salvar as novas credenciais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl text-center font-bold">
            Personalize seu Acesso de Administrador
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Você está conectado com o login padrão inicial. Para maior segurança, configure seu nome, e-mail institucional/pessoal e defina uma senha exclusiva.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="primeiro-nome" className="text-xs font-semibold">
              Seu Nome Completo
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="primeiro-nome"
                placeholder="Ex: Douglas Silva"
                className="pl-9 rounded-2xl"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primeiro-email" className="text-xs font-semibold">
              Seu Novo E-mail de Acesso
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="primeiro-email"
                type="email"
                placeholder="exemplo@escola.com"
                className="pl-9 rounded-2xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primeiro-senha" className="text-xs font-semibold">
              Nova Senha de Acesso (mínimo 6 dígitos)
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="primeiro-senha"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9 pr-9 rounded-2xl"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="primeiro-confirmar" className="text-xs font-semibold">
              Confirmar Nova Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="primeiro-confirmar"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9 rounded-2xl"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              className="rounded-2xl w-full sm:w-auto"
            >
              Lembrar mais tarde
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-2xl w-full sm:w-auto font-medium"
            >
              {loading ? "Salvando..." : "Salvar e Atualizar Acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

