import { AppSidebar } from "@/components/AppSidebar";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Building,
  Save,
  Plus,
  Trash2,
  Archive
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

interface PrefixoConfig {
  id: number;
  letra: string;
  inicio: number;
  fim: number;
}

const Configuracoes = () => {
  const { toast } = useToast();
  const { isDark, toggleTheme, primaryColor, changePrimaryColor, colorPalettes } = useTheme();
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

            {/* Segurança */}
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Segurança
                </CardTitle>
                <CardDescription>Configurações de segurança da conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senhaAtual">Senha Atual</Label>
                    <Input 
                      id="senhaAtual" 
                      type="password"
                      placeholder="••••••••" 
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="novaSenha">Nova Senha</Label>
                    <Input 
                      id="novaSenha" 
                      type="password"
                      placeholder="••••••••" 
                      className="rounded-2xl"
                    />
                  </div>
                </div>
                <Button variant="outline" className="rounded-2xl">
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>

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
