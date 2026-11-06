import { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Search, 
  Pencil, 
  Key, 
  Shuffle, 
  CheckSquare, 
  Square, 
  AlertCircle,
  Filter,
  GraduationCap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LockerBadge } from "@/components/LockerBadge";
import { useNavigate } from "react-router-dom";
import { ImportAlunosDialog } from "@/components/ImportAlunosDialog";
import { EditarAlunoDialog } from "@/components/EditarAlunoDialog";
import { api, AlunoItem } from "@/lib/api";
import { toast } from "sonner";

export default function Alunos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("todas");
  const [selectedAlunoIds, setSelectedAlunoIds] = useState<string[]>([]);
  
  // Modais de Edição e Exclusão
  const [editingAluno, setEditingAluno] = useState<AlunoItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoItem | null>(null);

  // Modal Rápido de Empréstimo de Chave
  const [alunoParaChave, setAlunoParaChave] = useState<AlunoItem | null>(null);
  const [armarioNumeroChave, setArmarioNumeroChave] = useState<string>("");
  const [obsChave, setObsChave] = useState("");

  const { data: armariosData = [] } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
    enabled: !!alunoParaChave,
  });

  // Carrega turmas para o filtro
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
  });

  // Carrega alunos com filtro de turma
  const { data: alunosData = [], isLoading } = useQuery({
    queryKey: ["alunos", selectedTurmaId],
    queryFn: () => api.getAlunos(selectedTurmaId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAluno(id),
    onSuccess: (data) => {
      toast.success(data.message || "Aluno inativado e armário liberado!");
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setAlunoParaExcluir(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover aluno");
    },
  });

  const emprestarChaveMutation = useMutation({
    mutationFn: () =>
      api.emprestarChave(
        alunoParaChave!.id,
        obsChave,
        alunoParaChave?.armario || armarioNumeroChave
      ),
    onSuccess: (data) => {
      toast.success(data.message || "Empréstimo de chave registrado!");
      queryClient.invalidateQueries({ queryKey: ["chavesAlertas"] });
      queryClient.invalidateQueries({ queryKey: ["chavesEmprestimos"] });
      setAlunoParaChave(null);
      setArmarioNumeroChave("");
      setObsChave("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao registrar empréstimo de chave");
    },
  });

  const filteredAlunos = alunosData.filter((aluno) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      aluno.nome.toLowerCase().includes(searchLower) ||
      aluno.matricula.includes(searchTerm)
    );
  });

  // Seleção múltipla para sorteio (Requisito 5)
  const toggleSelectAluno = (id: string) => {
    setSelectedAlunoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAlunoIds.length === filteredAlunos.length) {
      setSelectedAlunoIds([]);
    } else {
      setSelectedAlunoIds(filteredAlunos.map((a) => a.id));
    }
  };

  // Integração direta com sorteio (Requisito 5)
  const handleEnviarParaSorteio = () => {
    const alunosSelecionadosObjetos = alunosData
      .filter((a) => selectedAlunoIds.includes(a.id))
      .map((a) => ({
        id: a.id,
        nome: a.nome,
        matricula: a.matricula,
        turma: a.turma,
      }));

    if (alunosSelecionadosObjetos.length === 0) {
      toast.error("Selecione ao menos um aluno para enviar ao sorteio.");
      return;
    }

    navigate("/sorteio", {
      state: { alunosSelecionados: alunosSelecionadosObjetos },
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Gerenciamento de Alunos</h1>
              <p className="text-muted-foreground mt-1.5">
                Consulte, edite, envie participantes para sorteios e gerencie empréstimos de chaves.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {selectedAlunoIds.length > 0 && (
                <Button
                  onClick={handleEnviarParaSorteio}
                  className="rounded-2xl gap-2 font-bold bg-primary shadow-lg shadow-primary/20 animate-scale-in"
                >
                  <Shuffle className="h-4 w-4" />
                  Enviar para Sorteio ({selectedAlunoIds.length})
                </Button>
              )}

              <ImportAlunosDialog />
              <Button
                onClick={() => navigate("/alunos/cadastrar")}
                size="lg"
                className="rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl font-bold gap-2"
              >
                <Plus className="h-5 w-5" />
                Adicionar Aluno
              </Button>
            </div>
          </div>

          {/* Search e Filtro por Turma (Requisito 5) */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                className="pl-10 h-11 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Turma:</span>
              </div>
              <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId}>
                <SelectTrigger className="h-11 w-[220px] rounded-xl">
                  <SelectValue placeholder="Todas as Turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Turmas</SelectItem>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} ({t.totalAlunos} alunos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Barra de Ações Rápidas de Seleção */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 gap-1.5 text-xs rounded-lg"
              >
                {selectedAlunoIds.length === filteredAlunos.length && filteredAlunos.length > 0 ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Desmarcar Todos
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5" /> Selecionar Todos da Lista
                  </>
                )}
              </Button>
              {selectedAlunoIds.length > 0 && (
                <span>
                  <strong>{selectedAlunoIds.length}</strong> de {filteredAlunos.length} selecionados
                </span>
              )}
            </div>

            <span>Total: {filteredAlunos.length} alunos</span>
          </div>

          {/* Tabela com Rolagem Interna e Cabeçalho Sticky (Requisito 7) */}
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={
                          filteredAlunos.length > 0 &&
                          selectedAlunoIds.length === filteredAlunos.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Armário Atual</TableHead>
                    <TableHead className="text-right w-[160px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Carregando alunos do PostgreSQL...
                      </TableCell>
                    </TableRow>
                  ) : filteredAlunos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Nenhum aluno encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlunos.map((aluno) => {
                      const isSelected = selectedAlunoIds.includes(aluno.id);
                      const temArmario = !!aluno.armario;

                      return (
                        <TableRow
                          key={aluno.id}
                          className={`hover:bg-muted/40 transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectAluno(aluno.id)}
                            />
                          </TableCell>

                          <TableCell className="font-semibold text-foreground">
                            {aluno.nome}
                          </TableCell>

                          <TableCell className="text-muted-foreground text-sm">
                            {aluno.matricula}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {aluno.turma || "Sem Turma"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-muted-foreground text-xs">
                            {aluno.telefone || "—"}
                          </TableCell>

                          <TableCell className="text-muted-foreground text-xs">
                            {aluno.email || "—"}
                          </TableCell>

                          <TableCell>
                            <LockerBadge locker={aluno.armario} />
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* 6.1. Atalho Emprestar Chave */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg"
                                onClick={() => {
                                  setAlunoParaChave(aluno);
                                  setArmarioNumeroChave(aluno.armario || "");
                                }}
                                title="Emprestar chave para este aluno"
                              >
                                <Key className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                                onClick={() => {
                                  setEditingAluno(aluno);
                                  setEditDialogOpen(true);
                                }}
                                title="Editar dados do aluno"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                onClick={() => setAlunoParaExcluir(aluno)}
                                title="Excluir aluno"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

          <EditarAlunoDialog
            aluno={editingAluno}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        </div>
      </main>

      {/* Modal Rápido de Empréstimo de Chave (6.1) */}
      <Dialog open={!!alunoParaChave} onOpenChange={(val) => !val && setAlunoParaChave(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-600" />
              Emprestar Chave para {alunoParaChave?.nome}
            </DialogTitle>
            <DialogDescription>
              {alunoParaChave?.armario ? (
                <>Armário vinculado: <strong>{alunoParaChave.armario}</strong>.</>
              ) : (
                <>Este aluno não possui armário fixo. Selecione o armário da chave emprestada.</>
              )}{" "}
              O prazo regulamentar de devolução é de até <strong>2 dias</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {!alunoParaChave?.armario && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Número do Armário</Label>
                <Select value={armarioNumeroChave} onValueChange={setArmarioNumeroChave}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Escolha o armário" />
                  </SelectTrigger>
                  <SelectContent>
                    {armariosData.map((arm) => (
                      <SelectItem key={arm.id} value={arm.numero}>
                        Armário {arm.numero} {arm.bloco ? `(Bloco ${arm.bloco})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Observação do empréstimo (opcional)</Label>
              <Input
                placeholder="Ex: Cópia provisória / Esqueceu a chave"
                className="rounded-xl h-11"
                value={obsChave}
                onChange={(e) => setObsChave(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAlunoParaChave(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => emprestarChaveMutation.mutate()}
              disabled={
                emprestarChaveMutation.isPending ||
                (!alunoParaChave?.armario && !armarioNumeroChave)
              }
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
            >
              {emprestarChaveMutation.isPending ? "Registrando..." : "Confirmar Empréstimo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Aluno (Preserva integridade e histórico) */}
      <AlertDialog open={!!alunoParaExcluir} onOpenChange={(val) => !val && setAlunoParaExcluir(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Excluir Aluno
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente remover o aluno <strong>{alunoParaExcluir?.nome}</strong> (Matrícula: {alunoParaExcluir?.matricula})?
              <br /><br />
              <span className="text-xs text-muted-foreground">
                * O armário vinculado será automaticamente liberado e o histórico de sorteios e movimentações será mantido no sistema para fins de auditoria.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
              onClick={() => {
                if (alunoParaExcluir) {
                  deleteMutation.mutate(alunoParaExcluir.id);
                }
              }}
            >
              Sim, excluir aluno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
