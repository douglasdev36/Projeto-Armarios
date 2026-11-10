import { useState, useEffect } from "react";
import { 
  Key, 
  Search, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  ArrowDownLeft,
  Calendar,
  ShieldAlert,
  GraduationCap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { api, EmprestimoChaveItem } from "@/lib/api";
import { toast } from "sonner";

export default function EmprestimoChaves() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  
  // Modal de Novo Empréstimo
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [alunoSearchTerm, setAlunoSearchTerm] = useState("");
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("todas");
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>("");
  const [armarioNumero, setArmarioNumero] = useState<string>("");
  const [armarioSearchTerm, setArmarioSearchTerm] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Confirmação de Devolução
  const [devolucaoItem, setDevolucaoItem] = useState<EmprestimoChaveItem | null>(null);

  // Alertas e Resumos (compartilha intervalo global com a sidebar)
  const { data: alertasData } = useQuery({
    queryKey: ["chavesAlertas"],
    queryFn: api.getAlertasChaves,
    staleTime: 30000,
  });

  // Lista de Empréstimos (busca por status e filtra busca por texto localmente)
  const { data: emprestimos = [], isLoading } = useQuery({
    queryKey: ["chavesEmprestimos", statusFilter],
    queryFn: () => api.getEmprestimosChaves(statusFilter),
  });

  const filteredEmprestimos = emprestimos.filter((item) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.alunoNome.toLowerCase().includes(q) ||
      (item.alunoMatricula || "").toLowerCase().includes(q) ||
      item.armarioNumero.toLowerCase().includes(q)
    );
  });

  // Lista de todos os alunos ativos
  const { data: alunos = [], isLoading: isLoadingAlunos } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api.getAlunos(),
    enabled: isDialogOpen,
  });

  // Lista de turmas para filtro rápido no modal
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
    enabled: isDialogOpen,
  });

  // Lista de armários disponíveis para seleção caso o aluno não tenha um fixo
  const { data: armarios = [] } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
    enabled: isDialogOpen,
  });

  useEffect(() => {
    if (!isDialogOpen) {
      setAlunoSearchTerm("");
      setSelectedTurmaId("todas");
      setSelectedAlunoId("");
      setArmarioNumero("");
      setArmarioSearchTerm("");
      setObservacoes("");
    }
  }, [isDialogOpen]);

  const filteredModalAlunos = alunos.filter((a) => {
    const matchesTurma = selectedTurmaId === "todas" || a.turmaId === selectedTurmaId;
    if (!matchesTurma) return false;
    const q = alunoSearchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      (a.nome || "").toLowerCase().includes(q) ||
      (a.matricula || "").toLowerCase().includes(q)
    );
  });

  const filteredModalArmarios = [...armarios]
    .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: "base" }))
    .filter((arm) => {
      const q = armarioSearchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        arm.numero.toLowerCase().includes(q) ||
        (arm.bloco || "").toLowerCase().includes(q)
      );
    });

  const selectedAlunoObj = alunos.find((a) => a.id === selectedAlunoId);

  // Quando seleciona um aluno, preenche automaticamente o armário dele (se houver)
  useEffect(() => {
    if (selectedAlunoObj?.armario) {
      setArmarioNumero(selectedAlunoObj.armario);
    } else {
      setArmarioNumero("");
    }
  }, [selectedAlunoObj]);

  const criarEmprestimoMutation = useMutation({
    mutationFn: () =>
      api.emprestarChave(
        selectedAlunoId,
        observacoes,
        armarioNumero || selectedAlunoObj?.armario || undefined
      ),
    onSuccess: (data) => {
      toast.success(data.message || "Empréstimo registrado!");
      queryClient.invalidateQueries({ queryKey: ["chavesAlertas"] });
      queryClient.invalidateQueries({ queryKey: ["chavesEmprestimos"] });
      setIsDialogOpen(false);
      setSelectedAlunoId("");
      setArmarioNumero("");
      setObservacoes("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao registrar empréstimo");
    },
  });

  const devolverMutation = useMutation({
    mutationFn: (id: string) => api.devolverChave(id),
    onSuccess: (data) => {
      toast.success(data.message || "Devolução registrada!");
      queryClient.invalidateQueries({ queryKey: ["chavesAlertas"] });
      queryClient.invalidateQueries({ queryKey: ["chavesEmprestimos"] });
      setDevolucaoItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao registrar devolução");
    },
  });

  const totalAtrasadas = alertasData?.atrasadasCount ?? 0;
  const totalProximas = alertasData?.proximasCount ?? 0;
  const totalPendentes = alertasData?.totalPendentes ?? 0;

  const alunoTemArmario = !!selectedAlunoObj?.armario;
  const podeConfirmar = !!selectedAlunoId && (alunoTemArmario || !!armarioNumero);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
                <Key className="h-7 w-7 text-primary" />
                Controle de Empréstimo de Chaves
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Gerencie cópias de chaves concedidas a estudantes com controle rigoroso de prazo e alertas de atraso.
              </p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20">
                  <Plus className="h-5 w-5" />
                  Emprestar Chave
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    Registrar Empréstimo de Chave
                  </DialogTitle>
                  <DialogDescription>
                    Pesquise por nome ou matrícula para selecionar o aluno. O prazo regulamentar é de <strong>2 dias</strong>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Aluno Beneficiário</Label>

                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                      <Select
                        value={selectedTurmaId}
                        onValueChange={(val) => {
                          setSelectedTurmaId(val);
                          setSelectedAlunoId("");
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-xl flex-1">
                          <SelectValue placeholder="Filtrar por turma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas as Turmas</SelectItem>
                          {turmas.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar aluno por nome ou matrícula..."
                        className="pl-9 h-10 rounded-xl"
                        value={alunoSearchTerm}
                        onChange={(e) => setAlunoSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="max-h-[190px] overflow-y-auto border border-border rounded-xl p-1.5 space-y-1 divide-y divide-border/40">
                      {isLoadingAlunos ? (
                        <p className="p-4 text-center text-xs text-muted-foreground">
                          Carregando alunos...
                        </p>
                      ) : filteredModalAlunos.length === 0 ? (
                        <p className="p-4 text-center text-xs text-muted-foreground">
                          Nenhum aluno encontrado para os filtros informados.
                        </p>
                      ) : (
                        filteredModalAlunos.map((a) => {
                          const isSelected = selectedAlunoId === a.id;
                          return (
                            <div
                              key={a.id}
                              onClick={() => setSelectedAlunoId(a.id)}
                              className={`p-2.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-primary/10 border border-primary/40 text-foreground"
                                  : "hover:bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{a.nome}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  Matrícula: {a.matricula} • {a.turma || "Sem Turma"}{" "}
                                  {a.armario ? `• Armário ${a.armario}` : "• Sem armário fixo"}
                                </p>
                              </div>
                              {isSelected && (
                                <Badge className="shrink-0 gap-1 text-[11px] h-5">
                                  <UserCheck className="h-3 w-3" /> Selecionado
                                </Badge>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Se o aluno tem armário, exibe fixo; se não tem, permite buscar e escolher qual armário */}
                  {selectedAlunoObj && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Armário da Chave Emprestada ({selectedAlunoObj.nome})
                      </Label>
                      {alunoTemArmario ? (
                        <div className="p-3 bg-muted/40 rounded-xl border border-border text-sm flex items-center justify-between">
                          <span className="text-muted-foreground">Armário vinculado:</span>
                          <Badge className="font-bold">{selectedAlunoObj.armario}</Badge>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Filtrar armário por número ou bloco (ex: A-1)..."
                              className="pl-8 h-9 rounded-xl text-xs"
                              value={armarioSearchTerm}
                              onChange={(e) => setArmarioSearchTerm(e.target.value)}
                            />
                          </div>
                          <Select value={armarioNumero} onValueChange={setArmarioNumero}>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Escolha o número do armário" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredModalArmarios.length === 0 ? (
                                <div className="p-2 text-xs text-muted-foreground text-center">
                                  Nenhum armário encontrado
                                </div>
                              ) : (
                                filteredModalArmarios.map((arm) => (
                                  <SelectItem key={arm.id} value={arm.numero}>
                                    Armário {arm.numero} {arm.bloco ? `(Bloco ${arm.bloco})` : ""}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Observações (opcional)</Label>
                    <Input
                      placeholder="Ex: Esqueceu a chave em casa / Cópia provisória"
                      className="rounded-xl h-11"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                    />
                  </div>

                  <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Regra de Devolução:
                    </div>
                    <p className="text-muted-foreground">
                      A chave deverá ser devolvida em até 48 horas a partir deste registro. O sistema alertará caso o prazo expire.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => criarEmprestimoMutation.mutate()}
                    disabled={!podeConfirmar || criarEmprestimoMutation.isPending}
                    className="rounded-xl font-bold"
                  >
                    {criarEmprestimoMutation.isPending ? "Registrando..." : "Confirmar Empréstimo"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* 6.3. Banners e Cards de Alertas Visuais Vivos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Alerta de Atrasadas */}
            <div
              onClick={() => setStatusFilter("atrasada")}
              title="Clique para filtrar somente as chaves atrasadas"
              className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-colors cursor-pointer ${
                totalAtrasadas > 0
                  ? "bg-rose-500/10 border-rose-300 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 hover:bg-rose-500/15"
                  : "bg-card border-border hover:bg-muted/30"
              }`}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block opacity-80">
                  Prazo Vencido (Atrasadas)
                </span>
                <p className="text-3xl font-extrabold mt-1">{totalAtrasadas}</p>
                {totalAtrasadas > 0 && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Requer cobrança imediata</span>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>

            {/* Próximas ao Vencimento */}
            <div
              className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-colors ${
                totalProximas > 0
                  ? "bg-amber-500/10 border-amber-300 dark:border-amber-900/50 text-amber-800 dark:text-amber-300"
                  : "bg-card border-border"
              }`}
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block opacity-80">
                  Próximas do Vencimento (&lt; 12h)
                </span>
                <p className="text-3xl font-extrabold mt-1">{totalProximas}</p>
                {totalProximas > 0 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Vencem hoje</span>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {/* Total Pendentes */}
            <div className="p-5 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">
                  Total em Empréstimo
                </span>
                <p className="text-3xl font-extrabold text-foreground mt-1">{totalPendentes}</p>
                <span className="text-xs text-muted-foreground">Aguardando devolução</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Key className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por aluno, matrícula ou armário..."
                className="pl-10 h-11 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              <Button
                size="sm"
                variant={statusFilter === "todos" ? "default" : "outline"}
                onClick={() => setStatusFilter("todos")}
                className="rounded-xl h-9 text-xs"
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "pendente" ? "default" : "outline"}
                onClick={() => setStatusFilter("pendente")}
                className="rounded-xl h-9 text-xs"
              >
                Pendentes
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "atrasada" ? "destructive" : "outline"}
                onClick={() => setStatusFilter("atrasada")}
                className={`rounded-xl h-9 text-xs gap-1.5 ${
                  statusFilter !== "atrasada" && totalAtrasadas > 0
                    ? "border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    : ""
                }`}
              >
                Atrasadas
                {totalAtrasadas > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    {totalAtrasadas}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "devolvida" ? "default" : "outline"}
                onClick={() => setStatusFilter("devolvida")}
                className="rounded-xl h-9 text-xs"
              >
                Devolvidas
              </Button>
            </div>
          </div>

          {/* Tabela de Empréstimos com Rolagem Interna e Cabeçalho Fixo (Requisito 7) */}
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                  <TableRow>
                    <TableHead>Aluno / Matrícula</TableHead>
                    <TableHead>Armário</TableHead>
                    <TableHead>Data do Empréstimo</TableHead>
                    <TableHead>Prazo de Devolução</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Carregando registros de chaves...
                      </TableCell>
                    </TableRow>
                  ) : filteredEmprestimos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Nenhum registro de empréstimo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmprestimos.map((item) => {
                      const isDevolvida = item.status === "devolvida";
                      const isAtrasada = item.estadoVisual === "atrasada";

                      return (
                        <TableRow
                          key={item.id}
                          className={`transition-colors ${
                            isAtrasada
                              ? "bg-rose-500/5 hover:bg-rose-500/10"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <TableCell className="font-bold text-foreground">
                            <div>{item.alunoNome}</div>
                            {(item.alunoMatricula || item.alunoTurma) && (
                              <span className="block text-xs font-normal text-muted-foreground">
                                {item.alunoMatricula ? `Matrícula: ${item.alunoMatricula}` : ""}
                                {item.alunoMatricula && item.alunoTurma ? " • " : ""}
                                {item.alunoTurma || ""}
                              </span>
                            )}
                            {item.observacoes && (
                              <span className="block text-xs font-normal text-muted-foreground italic">
                                "{item.observacoes}"
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="font-bold">
                              Armário {item.armarioNumero}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(item.dataEmprestimo).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </TableCell>

                          <TableCell className="text-sm font-medium">
                            <span className={isAtrasada ? "text-rose-600 dark:text-rose-400 font-bold" : "text-muted-foreground"}>
                              {new Date(item.prazoDevolucao).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </TableCell>

                          <TableCell>
                            {isDevolvida ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">
                                Devolvida
                              </Badge>
                            ) : isAtrasada ? (
                              <Badge variant="destructive" className="animate-pulse text-xs">
                                Prazo Vencido
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                Aguardando Devolução
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {item.responsavelEmprestimo}
                          </TableCell>

                          <TableCell className="text-right">
                            {!isDevolvida ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 rounded-lg"
                                onClick={() => setDevolucaoItem(item)}
                              >
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                                Registrar Devolução
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Concluída ({new Date(item.dataDevolucao!).toLocaleDateString("pt-BR")})
                              </span>
                            )}
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

      {/* Confirmação de Devolução (6.2) */}
      <AlertDialog open={!!devolucaoItem} onOpenChange={(val) => !val && setDevolucaoItem(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Confirmar Devolução de Chave
            </AlertDialogTitle>
            <AlertDialogDescription>
              Confirma o recebimento da chave do armário <strong>{devolucaoItem?.armarioNumero}</strong> devolvida por{" "}
              <strong>{devolucaoItem?.alunoNome}</strong>?
              <br /><br />
              O sistema registrará a data/hora atual e o usuário autenticado como responsável pelo recolhimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              onClick={() => {
                if (devolucaoItem) {
                  devolverMutation.mutate(devolucaoItem.id);
                }
              }}
            >
              Sim, registrar devolução
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
