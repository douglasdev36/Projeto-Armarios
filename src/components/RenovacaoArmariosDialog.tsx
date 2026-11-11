import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Unlock,
  Play,
  Square,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ArmarioItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  detectCursoFromText,
  detectSerieInText,
  getCursoLabel,
  getTurmaCursoKey,
  getTurmaSerieKey,
  normalizeText,
} from "@/lib/turmaFilters";
import { toast } from "sonner";

interface RenovacaoArmariosDialogProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function RenovacaoArmariosDialog({
  externalOpen,
  onExternalOpenChange,
}: RenovacaoArmariosDialogProps = {}) {
  const { isGestor } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? onExternalOpenChange! : setInternalOpen;

  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ["renovacao-config"],
    queryFn: api.getRenovacaoConfig,
    enabled: open,
  });

  const { data: armarios = [] } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
    enabled: open,
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
    enabled: open,
  });

  const [titulo, setTitulo] = useState("Renovação de Armários");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [resetarRenovacoes, setResetarRenovacoes] = useState(true);
  const [busca, setBusca] = useState("");
  const [cursoFilter, setCursoFilter] = useState<string>("todos");
  const [serieFilter, setSerieFilter] = useState<string>("todos");
  const [turmaFilter, setTurmaFilter] = useState<string>("todas");
  const [activeTab, setActiveTab] = useState<"pendentes" | "renovados" | "todos">("pendentes");
  const [liberarConfirmOpen, setLiberarConfirmOpen] = useState(false);
  const [liberarEtapa, setLiberarEtapa] = useState<1 | 2>(1);
  const [encerrarConfirmOpen, setEncerrarConfirmOpen] = useState(false);

  useEffect(() => {
    if (config) {
      setTitulo(config.titulo || "Renovação de Armários");
      setDataInicio(config.dataInicio ? config.dataInicio.slice(0, 10) : "");
      setDataFim(config.dataFim ? config.dataFim.slice(0, 10) : "");
    }
  }, [config]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["renovacao-config"] });
    queryClient.invalidateQueries({ queryKey: ["armarios"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["alunos"] });
  };

  const configMutation = useMutation({
    mutationFn: api.saveRenovacaoConfig,
    onSuccess: (res) => {
      toast.success(res.message);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar configuração");
    },
  });

  const renovarMutation = useMutation({
    mutationFn: (id: string) => api.renovarArmario(id),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao renovar armário");
    },
  });

  const desfazerMutation = useMutation({
    mutationFn: (id: string) => api.desfazerRenovacaoArmario(id),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desfazer renovação");
    },
  });

  const liberarNaoRenovadosMutation = useMutation({
    mutationFn: api.liberarNaoRenovados,
    onSuccess: (res) => {
      toast.success(res.message);
      setLiberarConfirmOpen(false);
      setLiberarEtapa(1);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao liberar armários não renovados");
    },
  });

  const handleAtivarRenovacao = () => {
    if (!dataInicio || !dataFim) {
      toast.error("Informe a data de início e a data de término da renovação.");
      return;
    }
    configMutation.mutate({
      ativa: true,
      titulo,
      dataInicio,
      dataFim,
      resetarRenovacoes: !config?.ativa && resetarRenovacoes,
    });
  };

  const handleEncerrarRenovacao = () => {
    configMutation.mutate({
      ativa: false,
      titulo,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    });
  };

  const armariosOcupados = armarios
    .filter((a) => a.status === "ocupado")
    .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: "base" }));

  const turmasByNome = new Map(turmas.map((t) => [normalizeText(t.nome), t]));

  const getArmarioCursoKey = (arm: ArmarioItem) => {
    const turmaObj = arm.turma ? turmasByNome.get(normalizeText(arm.turma)) : undefined;
    return turmaObj ? getTurmaCursoKey(turmaObj) : detectCursoFromText(arm.turma || "");
  };

  const getArmarioSerieKey = (arm: ArmarioItem) => {
    const turmaObj = arm.turma ? turmasByNome.get(normalizeText(arm.turma)) : undefined;
    return turmaObj ? getTurmaSerieKey(turmaObj) : detectSerieInText(arm.turma || "") || "outra";
  };

  const cursosDisponiveis = Array.from(
    new Set([
      "administracao",
      "eletromecanica",
      "informatica",
      ...turmas.map((t) => getTurmaCursoKey(t)).filter((k) => k !== "outros"),
    ])
  );

  const turmasNoFiltro = turmas.filter((t) => {
    if (cursoFilter !== "todos" && getTurmaCursoKey(t) !== cursoFilter) return false;
    if (serieFilter !== "todos" && getTurmaSerieKey(t) !== serieFilter) return false;
    return true;
  });

  const ocupadosFiltrados = armariosOcupados.filter((a) => {
    if (cursoFilter !== "todos" && getArmarioCursoKey(a) !== cursoFilter) return false;
    if (serieFilter !== "todos" && getArmarioSerieKey(a) !== serieFilter) return false;
    if (turmaFilter !== "todas" && normalizeText(a.turma || "") !== normalizeText(turmaFilter)) return false;

    if (busca.trim()) {
      const q = busca.toLowerCase();
      const bate =
        a.numero.toLowerCase().includes(q) ||
        (a.aluno?.toLowerCase().includes(q) ?? false) ||
        (a.turma?.toLowerCase().includes(q) ?? false);
      if (!bate) return false;
    }
    return true;
  });

  const pendentes = ocupadosFiltrados.filter((a) => !a.renovado);
  const renovados = ocupadosFiltrados.filter((a) => a.renovado);

  const totalPendentesGeral = armariosOcupados.filter((a) => !a.renovado).length;
  const totalRenovadosGeral = armariosOcupados.filter((a) => a.renovado).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            variant={config?.ativa ? "default" : "outline"}
            className="rounded-2xl gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${config?.ativa ? "animate-spin" : ""}`} style={{ animationDuration: "8s" }} />
            Renovação de Armários
            {config?.ativa && (
              <Badge className="ml-1 bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                Ativa
              </Badge>
            )}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Renovação de Armários
            </DialogTitle>
            {config?.ativa ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                Campanha Ativa
              </Badge>
            ) : (
              <Badge variant="secondary">Desativada</Badge>
            )}
          </div>
          <DialogDescription>
            Configure o período de renovação e acompanhe em tempo real os armários já renovados e os pendentes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Seção 1: Configuração do Período (somente Coordenador/Admin) */}
          {isGestor ? (
            <div className="p-4 rounded-2xl border bg-muted/30 space-y-4">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                Configuração da Campanha de Renovação
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="titulo-renovacao" className="text-xs">Identificação / Período</Label>
                  <Input
                    id="titulo-renovacao"
                    placeholder="Ex: Renovação 2026"
                    className="rounded-xl"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="data-inicio" className="text-xs">Data de Início</Label>
                  <Input
                    id="data-inicio"
                    type="date"
                    className="rounded-xl"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="data-fim" className="text-xs">Data de Término</Label>
                  <Input
                    id="data-fim"
                    type="date"
                    className="rounded-xl"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>

              {!config?.ativa && (
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="resetar-renovacoes"
                    checked={resetarRenovacoes}
                    onCheckedChange={(checked) => setResetarRenovacoes(Boolean(checked))}
                  />
                  <Label htmlFor="resetar-renovacoes" className="text-xs text-muted-foreground cursor-pointer">
                    Iniciar nova campanha zerando renovações anteriores (todos os ocupados começam como pendentes)
                  </Label>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {config?.ativa ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleAtivarRenovacao}
                      disabled={configMutation.isPending}
                      className="rounded-xl gap-1.5"
                      size="sm"
                    >
                      <Calendar className="h-4 w-4" />
                      Atualizar Datas
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setEncerrarConfirmOpen(true)}
                      disabled={configMutation.isPending}
                      className="rounded-xl gap-1.5"
                      size="sm"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Encerrar Renovação
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleAtivarRenovacao}
                    disabled={configMutation.isPending}
                    className="rounded-xl gap-2 font-medium"
                  >
                    <Play className="h-4 w-4" />
                    {configMutation.isPending ? "Ativando..." : "Começar / Ativar Renovação"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl border bg-muted/30 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>
                  <strong>{config?.titulo || "Renovação de Armários"}</strong>{" "}
                  {config?.ativa && config.dataInicio && config.dataFim
                    ? `(${new Date(config.dataInicio).toLocaleDateString("pt-BR")} até ${new Date(config.dataFim).toLocaleDateString("pt-BR")})`
                    : ""}
                </span>
              </div>
              <span>Modo Atendimento: consulte e registre renovações abaixo.</span>
            </div>
          )}

          {/* Seção 2: Contadores de Controle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border bg-card flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Ocupados</p>
                <p className="text-2xl font-bold text-foreground">{armariosOcupados.length}</p>
              </div>
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Precisam Renovar</p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{totalPendentesGeral}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-600" />
            </div>

            <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Já Renovados</p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{totalRenovadosGeral}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </div>

          {/* Seção 3: Filtros por Curso, Ano, Turma e Status + Listagem */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  Filtrar por Curso, Ano / Série, Turma e Situação
                </span>
                {(cursoFilter !== "todos" || serieFilter !== "todos" || turmaFilter !== "todas" || busca.trim()) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setCursoFilter("todos");
                      setSerieFilter("todos");
                      setTurmaFilter("todas");
                      setBusca("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <Select
                  value={cursoFilter}
                  onValueChange={(val) => {
                    setCursoFilter(val);
                    setTurmaFilter("todas");
                  }}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue placeholder="Curso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Cursos</SelectItem>
                    {cursosDisponiveis.map((c) => (
                      <SelectItem key={c} value={c}>
                        {getCursoLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={serieFilter}
                  onValueChange={(val) => {
                    setSerieFilter(val);
                    setTurmaFilter("todas");
                  }}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue placeholder="Ano / Série" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Anos</SelectItem>
                    <SelectItem value="1">1º Ano</SelectItem>
                    <SelectItem value="2">2º Ano</SelectItem>
                    <SelectItem value="3">3º Ano</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Turmas</SelectItem>
                    {turmasNoFiltro.map((t) => (
                      <SelectItem key={t.id} value={t.nome}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={activeTab}
                  onValueChange={(val) => setActiveTab(val as "pendentes" | "renovados" | "todos")}
                >
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendentes">Faltam Renovar ({pendentes.length})</SelectItem>
                    <SelectItem value="renovados">Já Renovados ({renovados.length})</SelectItem>
                    <SelectItem value="todos">Todos Filtrados ({ocupadosFiltrados.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar armário, aluno ou turma..."
                  className="pl-9 rounded-xl h-10"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              {isGestor && totalPendentesGeral > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLiberarEtapa(1);
                    setLiberarConfirmOpen(true);
                  }}
                  className="rounded-xl gap-1.5 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Unlock className="h-4 w-4" />
                  Liberar Não Renovados ({totalPendentesGeral})
                </Button>
              )}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as "pendentes" | "renovados" | "todos")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 rounded-xl">
                <TabsTrigger value="pendentes" className="rounded-lg gap-1.5 text-xs sm:text-sm">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Faltam Renovar ({pendentes.length})
                </TabsTrigger>
                <TabsTrigger value="renovados" className="rounded-lg gap-1.5 text-xs sm:text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Já Renovados ({renovados.length})
                </TabsTrigger>
                <TabsTrigger value="todos" className="rounded-lg gap-1.5 text-xs sm:text-sm">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Todos ({ocupadosFiltrados.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pendentes" className="mt-3">
                <div className="border rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Armário</TableHead>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendentes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {ocupadosFiltrados.length === 0
                              ? "Nenhum armário ocupado encontrado para os filtros selecionados."
                              : "Todos os armários deste filtro já foram renovados! 🎉"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendentes.map((arm) => (
                          <TableRow key={arm.id}>
                            <TableCell className="font-bold">{arm.numero}</TableCell>
                            <TableCell className="font-medium">{arm.aluno || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{arm.turma || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{arm.contato || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                className="rounded-xl h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => renovarMutation.mutate(arm.id)}
                                disabled={renovarMutation.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Renovar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="renovados" className="mt-3">
                <div className="border rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Armário</TableHead>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Data Renovação</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renovados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum armário renovado encontrado para os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        renovados.map((arm) => (
                          <TableRow key={arm.id}>
                            <TableCell className="font-bold">{arm.numero}</TableCell>
                            <TableCell className="font-medium">{arm.aluno || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{arm.turma || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {arm.dataRenovacao
                                ? new Date(arm.dataRenovacao).toLocaleDateString("pt-BR")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {isGestor ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-xl h-8 gap-1 text-xs text-muted-foreground hover:text-amber-600"
                                  onClick={() => desfazerMutation.mutate(arm.id)}
                                  disabled={desfazerMutation.isPending}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Desfazer
                                </Button>
                              ) : (
                                <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                  Renovado
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="todos" className="mt-3">
                <div className="border rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Armário</TableHead>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ocupadosFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum armário ocupado encontrado para os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ocupadosFiltrados.map((arm) => (
                          <TableRow key={arm.id}>
                            <TableCell className="font-bold">{arm.numero}</TableCell>
                            <TableCell className="font-medium">{arm.aluno || "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{arm.turma || "—"}</TableCell>
                            <TableCell>
                              {arm.renovado ? (
                                <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px]">
                                  Renovado
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px]">
                                  Falta Renovar
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!arm.renovado ? (
                                <Button
                                  size="sm"
                                  className="rounded-xl h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => renovarMutation.mutate(arm.id)}
                                  disabled={renovarMutation.isPending}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Renovar
                                </Button>
                              ) : isGestor ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-xl h-8 gap-1 text-xs text-muted-foreground hover:text-amber-600"
                                  onClick={() => desfazerMutation.mutate(arm.id)}
                                  disabled={desfazerMutation.isPending}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Desfazer
                                </Button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-medium">Concluído</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      {/* Dupla confirmação: Liberar Armários Não Renovados */}
      <AlertDialog
        open={liberarConfirmOpen}
        onOpenChange={(val) => {
          setLiberarConfirmOpen(val);
          if (!val) setLiberarEtapa(1);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              {liberarEtapa === 1
                ? "Liberar Armários Não Renovados?"
                : "Confirmação Final — Liberar Todos os Pendentes?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {liberarEtapa === 1 ? (
                <>
                  Esta ação irá desvincular os alunos e liberar <strong>{totalPendentesGeral} armário(s)</strong> que ainda não realizaram a renovação, tornando-os livres para novos alunos/sorteios.
                </>
              ) : (
                <>
                  Tem <strong>certeza absoluta</strong> de que deseja liberar agora todos os{" "}
                  <strong>{totalPendentesGeral} armário(s) não renovado(s)</strong>? Esta operação liberará os armários em massa imediatamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            {liberarEtapa === 1 ? (
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={() => setLiberarEtapa(2)}
              >
                Continuar para Confirmação
              </Button>
            ) : (
              <AlertDialogAction
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={() => liberarNaoRenovadosMutation.mutate()}
              >
                Sim, liberar pendentes agora
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação: Encerrar Campanha de Renovação */}
      <AlertDialog open={encerrarConfirmOpen} onOpenChange={setEncerrarConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Encerrar Campanha de Renovação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente encerrar a campanha de renovação ativa? Ainda restam{" "}
              <strong>{totalPendentesGeral} armário(s)</strong> não renovado(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                handleEncerrarRenovacao();
                setEncerrarConfirmOpen(false);
              }}
            >
              Sim, encerrar campanha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

