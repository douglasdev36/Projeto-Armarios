import { useState } from "react";
import { Search, Trash2, Unlock, UserX, AlertCircle, Archive, ShieldAlert, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GerenciarArmariosDialog } from "@/components/GerenciarArmariosDialog";
import { DistribuirArmarioModal } from "@/components/DistribuirArmarioModal";
import { TrocarArmarioModal } from "@/components/TrocarArmarioModal";
import { ExcluirArmariosLoteDialog } from "@/components/ExcluirArmariosLoteDialog";
import { RenovacaoArmariosDialog } from "@/components/RenovacaoArmariosDialog";
import { api, ArmarioItem } from "@/lib/api";
import { toast } from "sonner";

type FilterType = "todos" | "livres" | "ocupados" | "pendentes_renovacao" | "renovados";

export default function Armarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("todos");
  const [selectedBloco, setSelectedBloco] = useState<string>("todos");
  const [armarioParaLiberar, setArmarioParaLiberar] = useState<ArmarioItem | null>(null);
  const [armarioParaExcluir, setArmarioParaExcluir] = useState<ArmarioItem | null>(null);
  const [renovacaoDialogOpen, setRenovacaoDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: armariosData = [], isLoading } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
  });

  const { data: renovacaoConfig } = useQuery({
    queryKey: ["renovacao-config"],
    queryFn: api.getRenovacaoConfig,
  });

  const renovarMutation = useMutation({
    mutationFn: (id: string) => api.renovarArmario(id),
    onSuccess: (data) => {
      toast.success(data.message || "Armário renovado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["renovacao-config"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao renovar armário");
    },
  });

  const liberarMutation = useMutation({
    mutationFn: (id: string) => api.liberarArmario(id),
    onSuccess: (data) => {
      toast.success(data.message || "Armário liberado!");
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setArmarioParaLiberar(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao liberar armário");
    },
  });

  const excluirMutation = useMutation({
    mutationFn: (id: string) => api.deleteArmario(id),
    onSuccess: (data) => {
      toast.success(data.message || "Armário excluído!");
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setArmarioParaExcluir(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir armário");
    },
  });

  const getArmarioBloco = (armario: ArmarioItem) =>
    (armario.bloco || armario.numero.split("-")[0] || "").toUpperCase();

  // Lista única de blocos para filtro com ordenação alfabética natural (A, B, C...)
  const blocosDisponiveis = Array.from(
    new Set(armariosData.map((a) => getArmarioBloco(a)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const armariosNoBloco =
    selectedBloco === "todos"
      ? armariosData
      : armariosData.filter((armario) => getArmarioBloco(armario) === selectedBloco);

  const filteredArmarios = armariosNoBloco
    .filter((armario) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        armario.numero.toLowerCase().includes(searchLower) ||
        (armario.aluno?.toLowerCase().includes(searchLower) ?? false);

      const matchesStatus =
        filter === "todos" ||
        (filter === "livres" && armario.status === "livre") ||
        (filter === "ocupados" && armario.status === "ocupado") ||
        (filter === "pendentes_renovacao" && armario.status === "ocupado" && !armario.renovado) ||
        (filter === "renovados" && armario.status === "ocupado" && armario.renovado);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const blocoA = getArmarioBloco(a);
      const blocoB = getArmarioBloco(b);
      if (blocoA !== blocoB) {
        return blocoA.localeCompare(blocoB, undefined, { numeric: true, sensitivity: "base" });
      }
      // Ordena numericamente dentro do bloco: A-1, A-2, A-3... A-10...
      return a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: "base" });
    });

  // Totais globais (para os cards superiores)
  const totalLivres = armariosData.filter((a) => a.status === "livre").length;
  const totalOcupados = armariosData.filter((a) => a.status === "ocupado").length;
  const totalRenovados = armariosData.filter((a) => a.status === "ocupado" && a.renovado).length;
  const totalPendentesRenovacao = armariosData.filter((a) => a.status === "ocupado" && !a.renovado).length;

  // Totais do bloco selecionado (para os botões de filtro)
  const blocoLivres = armariosNoBloco.filter((a) => a.status === "livre").length;
  const blocoOcupados = armariosNoBloco.filter((a) => a.status === "ocupado").length;
  const blocoRenovados = armariosNoBloco.filter((a) => a.status === "ocupado" && a.renovado).length;
  const blocoPendentesRenovacao = armariosNoBloco.filter((a) => a.status === "ocupado" && !a.renovado).length;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Painel de Controle de Armários</h1>
              <p className="text-muted-foreground mt-1.5">
                Distribuição direta, liberação, transferências e gestão completa dos armários.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={renovacaoConfig?.ativa ? "default" : "outline"}
                className="rounded-2xl gap-2"
                onClick={() => setRenovacaoDialogOpen(true)}
              >
                <RefreshCw
                  className={`h-4 w-4 ${renovacaoConfig?.ativa ? "animate-spin" : ""}`}
                  style={{ animationDuration: "8s" }}
                />
                Renovação de Armários
                {renovacaoConfig?.ativa && (
                  <Badge className="ml-1 bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                    Ativa
                  </Badge>
                )}
              </Button>
              <ExcluirArmariosLoteDialog />
              <GerenciarArmariosDialog />
            </div>
          </div>

          {/* Banner de Campanha de Renovação Ativa */}
          {renovacaoConfig?.ativa && (
            <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 text-primary shrink-0">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground">
                      {renovacaoConfig.titulo || "Renovação de Armários"} — Em Andamento
                    </h3>
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">Ativa</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Período:{" "}
                    <strong>
                      {renovacaoConfig.dataInicio ? new Date(renovacaoConfig.dataInicio).toLocaleDateString("pt-BR") : "—"}
                    </strong>{" "}
                    até{" "}
                    <strong>
                      {renovacaoConfig.dataFim ? new Date(renovacaoConfig.dataFim).toLocaleDateString("pt-BR") : "—"}
                    </strong>{" "}
                    • <span className="text-emerald-600 dark:text-emerald-400 font-medium">{totalRenovados} renovado(s)</span>{" "}
                    • <span className="text-amber-600 dark:text-amber-400 font-medium">{totalPendentesRenovacao} pendente(s)</span>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRenovacaoDialogOpen(true)}
                className="rounded-xl shrink-0 gap-1.5 border-primary/30 hover:bg-primary/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Painel de Renovações
              </Button>
            </div>
          )}

          <RenovacaoArmariosDialog
            externalOpen={renovacaoDialogOpen}
            onExternalOpenChange={setRenovacaoDialogOpen}
          />

          {/* Status Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium uppercase">Total de Armários</span>
                <p className="text-2xl font-bold text-foreground mt-0.5">{armariosData.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Archive className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium uppercase">Armários Livres</span>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">{totalLivres}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Unlock className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-700 dark:text-rose-400 font-medium uppercase">Armários Ocupados</span>
                <p className="text-2xl font-bold text-rose-800 dark:text-rose-300 mt-0.5">{totalOcupados}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <UserX className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do armário ou nome do aluno..."
                className="pl-10 h-11 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por Bloco */}
            {blocosDisponiveis.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <Button
                  size="sm"
                  variant={selectedBloco === "todos" ? "default" : "outline"}
                  onClick={() => setSelectedBloco("todos")}
                  className="rounded-xl h-9 text-xs"
                >
                  Todos Blocos
                </Button>
                {blocosDisponiveis.map((b) => (
                  <Button
                    key={b}
                    size="sm"
                    variant={selectedBloco === b ? "default" : "outline"}
                    onClick={() => setSelectedBloco(b)}
                    className="rounded-xl h-9 text-xs"
                  >
                    Bloco {b}
                  </Button>
                ))}
              </div>
            )}

            {/* Filtro por Status */}
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={filter === "todos" ? "default" : "outline"}
                onClick={() => setFilter("todos")}
                className="rounded-xl h-9 text-xs"
              >
                Todos ({armariosNoBloco.length})
              </Button>
              <Button
                size="sm"
                variant={filter === "livres" ? "default" : "outline"}
                onClick={() => setFilter("livres")}
                className="rounded-xl h-9 text-xs text-emerald-600 dark:text-emerald-400"
              >
                Livres ({blocoLivres})
              </Button>
              <Button
                size="sm"
                variant={filter === "ocupados" ? "default" : "outline"}
                onClick={() => setFilter("ocupados")}
                className="rounded-xl h-9 text-xs text-rose-600 dark:text-rose-400"
              >
                Ocupados ({blocoOcupados})
              </Button>
              {renovacaoConfig?.ativa && (
                <>
                  <Button
                    size="sm"
                    variant={filter === "pendentes_renovacao" ? "default" : "outline"}
                    onClick={() => setFilter("pendentes_renovacao")}
                    className="rounded-xl h-9 text-xs text-amber-600 dark:text-amber-400"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Precisam Renovar ({blocoPendentesRenovacao})
                  </Button>
                  <Button
                    size="sm"
                    variant={filter === "renovados" ? "default" : "outline"}
                    onClick={() => setFilter("renovados")}
                    className="rounded-xl h-9 text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Renovados ({blocoRenovados})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Table Container com Rolagem Interna e Cabeçalho Sticky (Requisito 7) */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-y-auto max-h-[520px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                  <TableRow>
                    <TableHead className="w-[120px]">Armário</TableHead>
                    <TableHead className="w-[170px]">Status</TableHead>
                    <TableHead>Aluno Responsável</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right w-[290px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Carregando armários...
                      </TableCell>
                    </TableRow>
                  ) : filteredArmarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <span>Nenhum armário encontrado com os filtros selecionados.</span>
                          {selectedBloco !== "todos" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBloco("todos")}
                              className="rounded-xl text-xs"
                            >
                              Ver em Todos os Blocos
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredArmarios.map((armario) => {
                      const isLivre = armario.status === "livre";
                      return (
                        <TableRow key={armario.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-bold text-foreground">
                            {armario.numero}
                            {armario.bloco && (
                              <span className="text-xs text-muted-foreground font-normal ml-1">
                                (Bloco {armario.bloco})
                              </span>
                            )}
                          </TableCell>

                          {/* Indicadores Visuais Distintos (Verde para livre, Vermelho para ocupado + status de renovação) */}
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isLivre ? (
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium text-xs">
                                  Livre
                                </Badge>
                              ) : (
                                <>
                                  <Badge variant="destructive" className="font-medium text-xs">
                                    Ocupado
                                  </Badge>
                                  {renovacaoConfig?.ativa && (
                                    armario.renovado ? (
                                      <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/15 font-medium text-[11px]">
                                        Renovado
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/15 font-medium text-[11px]">
                                        Renovar
                                      </Badge>
                                    )
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className={armario.aluno ? "font-semibold text-foreground" : "text-muted-foreground"}>
                            {armario.aluno || "—"}
                          </TableCell>

                          <TableCell className="text-muted-foreground text-sm">
                            {armario.turma || "—"}
                          </TableCell>

                          <TableCell className="text-muted-foreground text-xs">
                            {armario.contato || "—"}
                          </TableCell>

                          {/* Ações Inteligentes por Status */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isLivre ? (
                                <>
                                  {/* 3.2. Distribuição manual */}
                                  <DistribuirArmarioModal armario={armario} />

                                  {/* 3.5. Exclusão individual de armário livre */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                    title="Excluir armário livre"
                                    onClick={() => setArmarioParaExcluir(armario)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {renovacaoConfig?.ativa && !armario.renovado && (
                                    <Button
                                      size="sm"
                                      className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                      title="Confirmar renovação deste armário"
                                      disabled={renovarMutation.isPending}
                                      onClick={() => renovarMutation.mutate(armario.id)}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Renovar
                                    </Button>
                                  )}

                                  {/* 3.4. Troca de armário */}
                                  <TrocarArmarioModal armarioAtual={armario} />

                                  {/* 3.3. Liberação de armário */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                                    title="Liberar armário e desvincular aluno"
                                    onClick={() => setArmarioParaLiberar(armario)}
                                  >
                                    <Unlock className="h-3.5 w-3.5" />
                                    Liberar
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmação de Liberação de Armário */}
      <AlertDialog open={!!armarioParaLiberar} onOpenChange={(val) => !val && setArmarioParaLiberar(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Unlock className="h-5 w-5" />
              Liberar Armário {armarioParaLiberar?.numero}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente desvincular o aluno <strong>{armarioParaLiberar?.aluno}</strong> deste armário?
              <br /><br />
              O armário retornará ao status <strong>Livre</strong> e o histórico de utilização será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              onClick={() => {
                if (armarioParaLiberar) {
                  liberarMutation.mutate(armarioParaLiberar.id);
                }
              }}
            >
              Sim, liberar armário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exclusão Individual de Armário */}
      <AlertDialog open={!!armarioParaExcluir} onOpenChange={(val) => !val && setArmarioParaExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir Armário {armarioParaExcluir?.numero}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover permanentemente o armário <strong>{armarioParaExcluir?.numero}</strong> do sistema?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
              onClick={() => {
                if (armarioParaExcluir) {
                  excluirMutation.mutate(armarioParaExcluir.id);
                }
              }}
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
