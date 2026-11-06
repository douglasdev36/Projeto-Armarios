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
  ShieldAlert
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
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>("");
  const [armarioNumero, setArmarioNumero] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");

  // Confirmação de Devolução
  const [devolucaoItem, setDevolucaoItem] = useState<EmprestimoChaveItem | null>(null);

  // Alertas e Resumos
  const { data: alertasData } = useQuery({
    queryKey: ["chavesAlertas"],
    queryFn: api.getAlertasChaves,
    refetchInterval: 15000,
  });

  // Lista de Empréstimos
  const { data: emprestimos = [], isLoading } = useQuery({
    queryKey: ["chavesEmprestimos", statusFilter, searchTerm],
    queryFn: () => api.getEmprestimosChaves(statusFilter, searchTerm),
  });

  // Lista de todos os alunos ativos
  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api.getAlunos(),
    enabled: isDialogOpen,
  });

  // Lista de armários disponíveis para seleção caso o aluno não tenha um fixo
  const { data: armarios = [] } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
    enabled: isDialogOpen,
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

              <DialogContent className="max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    Registrar Empréstimo de Chave
                  </DialogTitle>
                  <DialogDescription>
                    Selecione o aluno que receberá a cópia. O prazo regulamentar é de <strong>2 dias</strong>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Aluno Beneficiário</Label>
                    <Select value={selectedAlunoId} onValueChange={setSelectedAlunoId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Selecione o aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        {alunos.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">Nenhum aluno cadastrado</div>
                        ) : (
                          alunos.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nome} {a.armario ? `(Armário ${a.armario})` : `(Sem armário fixo)`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Se o aluno tem armário, exibe fixo; se não tem, permite escolher qual armário */}
                  {selectedAlunoObj && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Armário da Chave Emprestada
                      </Label>
                      {alunoTemArmario ? (
                        <div className="p-3 bg-muted/40 rounded-xl border border-border text-sm flex items-center justify-between">
                          <span className="text-muted-foreground">Armário vinculado:</span>
                          <Badge className="font-bold">{selectedAlunoObj.armario}</Badge>
                        </div>
                      ) : (
                        <Select value={armarioNumero} onValueChange={setArmarioNumero}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Escolha o número do armário" />
                          </SelectTrigger>
                          <SelectContent>
                            {armarios.map((arm) => (
                              <SelectItem key={arm.id} value={arm.numero}>
                                Armário {arm.numero} {arm.bloco ? `(Bloco ${arm.bloco})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
              className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-colors ${
                totalAtrasadas > 0
                  ? "bg-rose-500/10 border-rose-300 dark:border-rose-900/50 text-rose-800 dark:text-rose-300"
                  : "bg-card border-border"
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
                placeholder="Buscar por aluno ou número do armário..."
                className="pl-10 h-11 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-1.5 w-full sm:w-auto">
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
                  ) : emprestimos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        Nenhum registro de empréstimo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    emprestimos.map((item) => {
                      const isDevolvida = item.status === "devolvida";
                      const isAtrasada = item.estadoVisual === "atrasada";

                      return (
                        <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-bold text-foreground">
                            {item.alunoNome}
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
