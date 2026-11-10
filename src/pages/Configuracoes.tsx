import { AppSidebar } from "@/components/AppSidebar";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Building,
  Save,
  Plus,
  Trash2,
  Archive,
  Users,
  UserPlus,
  Key,
  Mail,
  UserCheck,
  ShieldCheck,
  Lock
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { api, UserItem } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface PrefixoConfig {
  id: number;
  letra: string;
  inicio: number;
  fim: number;
}

const Configuracoes = () => {
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { isDark, toggleTheme, primaryColor, changePrimaryColor, colorPalettes } = useTheme();

  // Estados do Perfil / Senha do Usuário Logado
  const [nomePerfil, setNomePerfil] = useState(user?.nome || "");
  const [emailPerfil, setEmailPerfil] = useState(user?.email || "");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  useEffect(() => {
    if (user) {
      setNomePerfil(user.nome);
      setEmailPerfil(user.email);
    }
  }, [user]);

  const isAdmin = user?.role === "coordenador" || user?.role === "admin";

  // Consulta de Usuários do Sistema (somente administradores/coordenadores)
  const { data: usuarios = [], isLoading: carregandoUsuarios } = useQuery({
    queryKey: ["usuarios"],
    queryFn: api.getUsuarios,
    enabled: isAdmin,
  });

  // Modal Novo Usuário
  const [novoUsuarioOpen, setNovoUsuarioOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenhaUsuario, setNovaSenhaUsuario] = useState("");
  const [novoRole, setNovoRole] = useState("coordenador");
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);

  const handleSalvarPerfil = async () => {
    if (!nomePerfil.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha seu nome.",
        variant: "destructive",
      });
      return;
    }

    if (!emailPerfil.trim() || !emailPerfil.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, preencha um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    if (novaSenha) {
      if (novaSenha.length < 6) {
        toast({
          title: "Senha muito curta",
          description: "A nova senha deve ter no mínimo 6 caracteres.",
          variant: "destructive",
        });
        return;
      }
      if (novaSenha !== confirmarNovaSenha) {
        toast({
          title: "Senhas não conferem",
          description: "A confirmação não coincide com a nova senha digitada.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setSalvandoPerfil(true);
      const res = await api.updateProfile({
        nome: nomePerfil.trim(),
        email: emailPerfil.trim(),
        currentPassword: senhaAtual || undefined,
        newPassword: novaSenha || undefined,
      });

      updateUser(res.user, res.token);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");

      toast({
        title: "✨ Perfil atualizado!",
        description: "Suas informações e credenciais de acesso foram salvas com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: err.message || "Não foi possível atualizar seus dados.",
        variant: "destructive",
      });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoEmail.trim() || !novaSenhaUsuario) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, e-mail e senha inicial.",
        variant: "destructive",
      });
      return;
    }

    if (novaSenhaUsuario.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSalvandoUsuario(true);
      await api.createUsuario({
        nome: novoNome.trim(),
        email: novoEmail.trim(),
        senha: novaSenhaUsuario,
        role: novoRole,
      });

      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setNovoUsuarioOpen(false);
      setNovoNome("");
      setNovoEmail("");
      setNovaSenhaUsuario("");
      setNovoRole("coordenador");

      toast({
        title: "Usuário cadastrado!",
        description: "Novo acesso criado com sucesso no sistema.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao criar usuário",
        description: err.message || "Não foi possível criar o usuário.",
        variant: "destructive",
      });
    } finally {
      setSalvandoUsuario(false);
    }
  };

  const handleExcluirUsuario = async (id: string, nome: string) => {
    try {
      await api.deleteUsuario(id);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast({
        title: "Usuário removido",
        description: `O acesso de ${nome} foi removido com sucesso.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao remover usuário",
        description: err.message || "Não foi possível excluir o usuário.",
        variant: "destructive",
      });
    }
  };

  const [notificacoesEmail, setNotificacoesEmail] = useState(true);
  const [notificacoesSistema, setNotificacoesSistema] = useState(true);
  const [prefixos, setPrefixos] = useState<PrefixoConfig[]>([
    { id: 1, letra: "A", inicio: 1, fim: 40 },
    { id: 2, letra: "B", inicio: 41, fim: 60 },
    { id: 3, letra: "C", inicio: 61, fim: 85 },
  ]);

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  };

  const addPrefixo = () => {
    const lastPrefixo = prefixos[prefixos.length - 1];
    const nextLetra = String.fromCharCode(lastPrefixo ? lastPrefixo.letra.charCodeAt(0) + 1 : 65);
    const nextInicio = lastPrefixo ? lastPrefixo.fim + 1 : 1;
    setPrefixos([...prefixos, { 
      id: Date.now(), 
      letra: nextLetra, 
      inicio: nextInicio, 
      fim: nextInicio + 19 
    }]);
  };

  const removePrefixo = (id: number) => {
    if (prefixos.length > 1) {
      setPrefixos(prefixos.filter(p => p.id !== id));
    }
  };

  const updatePrefixo = (id: number, field: keyof PrefixoConfig, value: string | number) => {
    setPrefixos(prefixos.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // Gera preview dos armários
  const getPreview = () => {
    return prefixos.map(p => `${p.letra}${p.inicio} até ${p.letra}${p.fim}`).join(', ');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Configurações</h1>
            <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
          </div>

          <div className="space-y-6">
            {/* Informações da Escola */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Informações da Escola
                </CardTitle>
                <CardDescription>Dados da instituição de ensino</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeEscola">Nome da Escola</Label>
                    <Input 
                      id="nomeEscola" 
                      defaultValue="Colégio Estadual Exemplo" 
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input 
                      id="cnpj" 
                      defaultValue="12.345.678/0001-90" 
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input 
                      id="endereco" 
                      defaultValue="Rua das Flores, 123 - Centro" 
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input 
                      id="telefone" 
                      defaultValue="(11) 1234-5678" 
                      className="rounded-2xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuração de Prefixos de Armários */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Archive className="h-5 w-5 text-primary" />
                  Prefixos de Armários
                </CardTitle>
                <CardDescription>
                  Configure os prefixos (letras) para cada faixa de armários. Ex: A1, A2... B41, B42...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Lista de prefixos */}
                <div className="space-y-3">
                  {prefixos.map((prefixo, index) => (
                    <div 
                      key={prefixo.id} 
                      className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Letra</Label>
                          <Input
                            value={prefixo.letra}
                            onChange={(e) => updatePrefixo(prefixo.id, 'letra', e.target.value.toUpperCase().slice(0, 1))}
                            className="w-16 rounded-xl text-center font-bold text-lg"
                            maxLength={1}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Início</Label>
                          <Input
                            type="number"
                            value={prefixo.inicio}
                            onChange={(e) => updatePrefixo(prefixo.id, 'inicio', parseInt(e.target.value) || 0)}
                            className="w-24 rounded-xl"
                          />
                        </div>
                        <span className="text-muted-foreground mt-5">até</span>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Fim</Label>
                          <Input
                            type="number"
                            value={prefixo.fim}
                            onChange={(e) => updatePrefixo(prefixo.id, 'fim', parseInt(e.target.value) || 0)}
                            className="w-24 rounded-xl"
                          />
                        </div>
                        <div className="ml-4 mt-5">
                          <span className="text-sm text-muted-foreground">
                            ({prefixo.fim - prefixo.inicio + 1} armários: {prefixo.letra}{prefixo.inicio} - {prefixo.letra}{prefixo.fim})
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => removePrefixo(prefixo.id)}
                        disabled={prefixos.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Botão adicionar */}
                <Button 
                  variant="outline" 
                  className="w-full rounded-2xl gap-2"
                  onClick={addPrefixo}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Faixa de Prefixo
                </Button>

                {/* Preview */}
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-1">Preview dos Armários:</p>
                  <p className="text-sm text-muted-foreground">{getPreview()}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total: {prefixos.reduce((acc, p) => acc + (p.fim - p.inicio + 1), 0)} armários
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Configurações Gerais de Armários */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Configurações Gerais
                </CardTitle>
                <CardDescription>Outras configurações para gestão de armários</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Período de Uso</Label>
                    <Select defaultValue="anual">
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Selecione o período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                        <SelectItem value="bimestral">Bimestral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Atribuição</Label>
                    <Select defaultValue="sorteio">
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sorteio">Sorteio</SelectItem>
                        <SelectItem value="ordem">Ordem de chegada</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notificações */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notificações
                </CardTitle>
                <CardDescription>Configure como deseja receber alertas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas sobre novos sorteios e atribuições
                    </p>
                  </div>
                  <Switch 
                    checked={notificacoesEmail} 
                    onCheckedChange={setNotificacoesEmail}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Notificações do Sistema</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir alertas dentro do sistema
                    </p>
                  </div>
                  <Switch 
                    checked={notificacoesSistema} 
                    onCheckedChange={setNotificacoesSistema}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Aparência */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Aparência
                </CardTitle>
                <CardDescription>Personalize a aparência do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Modo Escuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativar tema escuro para o sistema
                    </p>
                  </div>
                  <Switch 
                    checked={isDark} 
                    onCheckedChange={toggleTheme}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Cor Principal do Sistema</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Selecione a cor de destaque da interface (botões, detalhes e indicadores).
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {(Object.keys(colorPalettes) as Array<keyof typeof colorPalettes>).map((colorKey) => {
                      const palette = colorPalettes[colorKey];
                      const isSelected = primaryColor === colorKey;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          title={palette.name}
                          onClick={() => {
                            changePrimaryColor(colorKey);
                            toast({
                              title: "Cor alterada",
                              description: `Tema atualizado para ${palette.name}`,
                            });
                          }}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer",
                            palette.bgClass,
                            isSelected
                              ? "ring-4 ring-primary/40 ring-offset-2 ring-offset-background scale-110 shadow-lg"
                              : "hover:scale-105 hover:opacity-90"
                          )}
                        >
                          {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meu Perfil e Credenciais */}
            <Card className="rounded-3xl border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Meu Perfil & Segurança de Acesso
                </CardTitle>
                <CardDescription>
                  Atualize seu nome, endereço de e-mail e troque sua senha de login.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomePerfil">Nome do Usuário</Label>
                    <Input 
                      id="nomePerfil" 
                      value={nomePerfil}
                      onChange={(e) => setNomePerfil(e.target.value)}
                      placeholder="Seu nome completo" 
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailPerfil">E-mail de Acesso (Login)</Label>
                    <Input 
                      id="emailPerfil" 
                      type="email"
                      value={emailPerfil}
                      onChange={(e) => setEmailPerfil(e.target.value)}
                      placeholder="seu.email@escola.com" 
                      className="rounded-2xl"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    Alterar Senha de Acesso
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Deixe os campos de senha em branco caso deseje manter a senha atual.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="senhaAtual" className="text-xs">Senha Atual</Label>
                      <Input 
                        id="senhaAtual" 
                        type="password"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        placeholder="••••••••" 
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="novaSenha" className="text-xs">Nova Senha (min. 6 dígitos)</Label>
                      <Input 
                        id="novaSenha" 
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="••••••••" 
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmarNovaSenha" className="text-xs">Confirmar Nova Senha</Label>
                      <Input 
                        id="confirmarNovaSenha" 
                        type="password"
                        value={confirmarNovaSenha}
                        onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                        placeholder="••••••••" 
                        className="rounded-2xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSalvarPerfil} 
                    disabled={salvandoPerfil}
                    className="rounded-2xl gap-2 font-medium"
                  >
                    <Save className="h-4 w-4" />
                    {salvandoPerfil ? "Salvando..." : "Atualizar Meus Dados"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gerenciamento de Usuários do Sistema */}
            {isAdmin && (
            <Card className="rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Usuários e Acessos ao Sistema
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Cadastre novos membros da equipe e gerencie quem pode acessar o painel.
                  </CardDescription>
                </div>

                {/* Dialog de Criação de Novo Usuário */}
                <Dialog open={novoUsuarioOpen} onOpenChange={setNovoUsuarioOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-2xl gap-2 font-medium">
                      <UserPlus className="h-4 w-4" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Cadastrar Novo Usuário
                      </DialogTitle>
                      <DialogDescription>
                        Crie uma nova conta para outro coordenador, administrador ou atendente.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCriarUsuario} className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="novoNome" className="text-xs font-semibold">Nome Completo</Label>
                        <Input
                          id="novoNome"
                          placeholder="Ex: Maria Fernandes"
                          className="rounded-2xl"
                          value={novoNome}
                          onChange={(e) => setNovoNome(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="novoEmail" className="text-xs font-semibold">E-mail Institucional</Label>
                        <Input
                          id="novoEmail"
                          type="email"
                          placeholder="maria@escola.com"
                          className="rounded-2xl"
                          value={novoEmail}
                          onChange={(e) => setNovoEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="novaSenhaUsuario" className="text-xs font-semibold">Senha Inicial (mínimo 6 dígitos)</Label>
                        <Input
                          id="novaSenhaUsuario"
                          type="password"
                          placeholder="••••••••"
                          className="rounded-2xl"
                          value={novaSenhaUsuario}
                          onChange={(e) => setNovaSenhaUsuario(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="novoRole" className="text-xs font-semibold">Função / Perfil de Acesso</Label>
                        <Select value={novoRole} onValueChange={setNovoRole}>
                          <SelectTrigger className="rounded-2xl">
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coordenador">Coordenador Pedagógico</SelectItem>
                            <SelectItem value="admin">Administrador Geral</SelectItem>
                            <SelectItem value="atendente">Atendente / Secretaria</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setNovoUsuarioOpen(false)}
                          className="rounded-2xl"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={salvandoUsuario}
                          className="rounded-2xl"
                        >
                          {salvandoUsuario ? "Cadastrando..." : "Cadastrar Usuário"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent>
                {carregandoUsuarios ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Carregando usuários...</p>
                ) : usuarios.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário cadastrado.</p>
                ) : (
                  <div className="rounded-2xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usuarios.map((u) => {
                          const isCurrentUser = u.id === user?.id;
                          return (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium flex items-center gap-2">
                                <span>{u.nome}</span>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                    Você
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{u.email}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {u.role || "Coordenador"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {isCurrentUser ? (
                                  <span className="text-xs text-muted-foreground italic">Em uso</span>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-8 w-8"
                                        title="Excluir Usuário"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Usuário?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja remover o acesso de <strong>{u.nome}</strong> ({u.email})? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleExcluirUsuario(u.id, u.nome)}
                                          className="rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                        >
                                          Confirmar Exclusão
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Botão Salvar */}
            <div className="flex justify-end">
              <Button onClick={handleSave} size="lg" className="rounded-2xl gap-2">
                <Save className="h-5 w-5" />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Configuracoes;
