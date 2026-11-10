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
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Unlock,
  Play,
  Square,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ArmarioItem } from "@/lib/api";
import { toast } from "sonner";

interface RenovacaoArmariosDialogProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function RenovacaoArmariosDialog({
  externalOpen,
  onExternalOpenChange,
}: RenovacaoArmariosDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? onExternalOpenChange! : setInternalOpen;

  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ["renovacao-config"],
    queryFn: api.getRenovacaoConfig,
  });

  const { data: armarios = [] } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
  });

  const [titulo, setTitulo] = useState("Renovação de Armários");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [resetarRenovacoes, setResetarRenovacoes] = useState(true);
  const [busca, setBusca] = useState("");

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

  const filtrar = (lista: ArmarioItem[]) => {
    if (!busca.trim()) return lista;
    const q = busca.toLowerCase();
    return lista.filter(
      (a) =>
        a.numero.toLowerCase().includes(q) ||
        (a.aluno?.toLowerCase().includes(q) ?? false) ||
        (a.turma?.toLowerCase().includes(q) ?? false)
    );
  };

  const pendentes = filtrar(armariosOcupados.filter((a) => !a.renovado));
  const renovados = filtrar(armariosOcupados.filter((a) => a.renovado));

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
          {/* Seção 1: Configuração do Período */}
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
                    onClick={handleEncerrarRenovacao}
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

          {/* Seção 3: Listagem Separada para Controle */}
          <div className="space-y-3">
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

              {totalPendentesGeral > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Unlock className="h-4 w-4" />
                      Liberar Não Renovados ({totalPendentesGeral})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Liberar Armários Não Renovados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá desvincular os alunos e liberar <strong>{totalPendentesGeral} armário(s)</strong> que ainda não realizaram a renovação, tornando-os livres para novos alunos/sorteios. O histórico será preservado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => liberarNaoRenovadosMutation.mutate()}
                      >
                        Sim, liberar pendentes
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <Tabs defaultValue="pendentes" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="pendentes" className="rounded-lg gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Precisam Renovar ({pendentes.length})
                </TabsTrigger>
                <TabsTrigger value="renovados" className="rounded-lg gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Já Renovados ({renovados.length})
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
                            {armariosOcupados.length === 0
                              ? "Nenhum armário ocupado no momento."
                              : "Todos os armários ocupados já foram renovados! 🎉"}
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
                            Nenhum armário renovado ainda nesta campanha.
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
    </Dialog>
  );
}
