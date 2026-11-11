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
  GraduationCap,
  RefreshCw,
  Archive,
  StickyNote
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
import { Textarea } from "@/components/ui/textarea";
import { LockerBadge } from "@/components/LockerBadge";
import { useNavigate } from "react-router-dom";
import { ImportAlunosDialog } from "@/components/ImportAlunosDialog";
import { EditarAlunoDialog } from "@/components/EditarAlunoDialog";
import { AtribuirArmarioAlunoModal } from "@/components/AtribuirArmarioAlunoModal";
import { api, AlunoItem, TurmaItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type CursoFilterKey = "todos" | "administracao" | "eletromecanica" | "informatica" | string;
type SerieFilterKey = string; // "todo_curso" | "1" | "2" | "3" | `turma:${id}`

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectCursoFromText(raw: string): string {
  const texto = normalizeText(raw);
  if (!texto) return "outros";
  if (texto.includes("admin") || /(?:^|[^a-z])adm/.test(texto)) return "administracao";
  if (texto.includes("eletro") || /(?:^|[^a-z])[123]?el\b/.test(texto)) return "eletromecanica";
  if (texto.includes("info") || /(?:^|[^a-z])[123]?inf/.test(texto)) return "informatica";
  return "outros";
}

function getTurmaCursoKey(turma: TurmaItem): string {
  const detected = detectCursoFromText(`${turma.curso || ""} ${turma.nome || ""}`);
  if (detected !== "outros") return detected;
  const cursoLimpo = turma.curso?.trim();
  if (cursoLimpo && normalizeText(cursoLimpo) !== "ensino regular") {
    return normalizeText(cursoLimpo);
  }
  return "outros";
}

function detectSerieInText(raw: string): "1" | "2" | "3" | null {
  const texto = normalizeText(raw);
  if (!texto) return null;

  // Remove anos letivos de 4 dígitos (ex: 2024, 2025, 2026) para não confundir
  const semAnoLetivo = texto.replace(/\b20\d{2}\b/g, " ");

  // 1º / 1ª / 1° / 1o / 1a / 1A / 1INFO / Primeiro / I / códigos 101-199
  if (
    semAnoLetivo.includes("primeiro") ||
    /(?:^|[^0-9])1(?![0-9])/.test(semAnoLetivo) ||
    /(?:^|\s)1\d{2}(?:\s|$|-)/.test(semAnoLetivo) ||
    /\bi\b/.test(semAnoLetivo)
  ) {
    return "1";
  }

  // 2º / 2ª / 2° / 2o / 2a / 2A / 2INFO / Segundo / II / códigos 201-299
  if (
    semAnoLetivo.includes("segundo") ||
    /(?:^|[^0-9])2(?![0-9])/.test(semAnoLetivo) ||
    /(?:^|\s)2\d{2}(?:\s|$|-)/.test(semAnoLetivo) ||
    /\bii\b/.test(semAnoLetivo)
  ) {
    return "2";
  }

  // 3º / 3ª / 3° / 3o / 3a / 3A / 3INFO / Terceiro / III / códigos 301-399
  if (
    semAnoLetivo.includes("terceiro") ||
    /(?:^|[^0-9])3(?![0-9])/.test(semAnoLetivo) ||
    /(?:^|\s)3\d{2}(?:\s|$|-)/.test(semAnoLetivo) ||
    /\biii\b/.test(semAnoLetivo)
  ) {
    return "3";
  }

  return null;
}

function getTurmaSerieKey(turma: TurmaItem): "1" | "2" | "3" | "outra" {
  // Prioriza o nome da turma (mais específico) e usa turma.serie como fallback
  return detectSerieInText(turma.nome || "") || detectSerieInText(turma.serie || "") || "outra";
}

export default function Alunos() {
  const { isGestor } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCurso, setSelectedCurso] = useState<CursoFilterKey>("todos");
  const [selectedSerie, setSelectedSerie] = useState<SerieFilterKey>("todo_curso");
  const [selectedAlunoIds, setSelectedAlunoIds] = useState<string[]>([]);

  // Modais de Edição, Armário, Observação e Exclusão
  const [editingAluno, setEditingAluno] = useState<AlunoItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoItem | null>(null);
  const [etapaExcluirAluno, setEtapaExcluirAluno] = useState<1 | 2>(1);
  const [alunoParaArmario, setAlunoParaArmario] = useState<AlunoItem | null>(null);
  const [alunoParaObservacao, setAlunoParaObservacao] = useState<AlunoItem | null>(null);
  const [observacaoTexto, setObservacaoTexto] = useState("");

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

  // Carrega todos os alunos ativos uma única vez (reaproveita cache global) e filtra instantaneamente
  const { data: alunosData = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api.getAlunos(),
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

  const observacaoMutation = useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao: string }) =>
      api.updateObservacaoAluno(id, observacao),
    onSuccess: (data) => {
      toast.success(data.message || "Observação salva!");
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      setAlunoParaObservacao(null);
      setObservacaoTexto("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar observação");
    },
  });

  const turmasById = new Map(turmas.map((t) => [t.id, t]));

  // Cursos extras cadastrados além dos 3 principais (Administração, Eletromecânica, Informática)
  const cursosPrincipais: Array<{ key: CursoFilterKey; label: string }> = [
    { key: "administracao", label: "Administração" },
    { key: "eletromecanica", label: "Eletromecânica" },
    { key: "informatica", label: "Informática" },
  ];

  const handleSelectCurso = (cursoKey: CursoFilterKey) => {
    setSelectedCurso(cursoKey);
    setSelectedSerie("todo_curso");
    setSelectedAlunoIds([]);
  };

  const handleSelectSerie = (serieKey: SerieFilterKey) => {
    setSelectedSerie(serieKey);
    setSelectedAlunoIds([]);
  };

  const getAlunoCursoESerie = (aluno: AlunoItem) => {
    const turmaObj = aluno.turmaId ? turmasById.get(aluno.turmaId) : undefined;

    const cursoAluno = turmaObj
      ? getTurmaCursoKey(turmaObj)
      : detectCursoFromText(aluno.turma || "");

    const serieAluno = turmaObj
      ? getTurmaSerieKey(turmaObj)
      : detectSerieInText(aluno.turma || "") || "outra";

    return { cursoAluno, serieAluno };
  };

  const countCurso = (cursoKey: string) =>
    alunosData.filter((a) => getAlunoCursoESerie(a).cursoAluno === cursoKey).length;

  const countOutrosCursos = countCurso("outros");

  // Alunos pertencentes ao curso selecionado (para contagem nas abas de 1º, 2º, 3º Ano)
  const alunosDoCursoSelecionado =
    selectedCurso === "todos"
      ? alunosData
      : alunosData.filter((a) => getAlunoCursoESerie(a).cursoAluno === selectedCurso);

  const countSerie = (s: "1" | "2" | "3") =>
    alunosDoCursoSelecionado.filter((a) => getAlunoCursoESerie(a).serieAluno === s).length;

  const turmasOutrasDoCurso =
    selectedCurso === "todos"
      ? []
      : turmas.filter(
        (t) => getTurmaCursoKey(t) === selectedCurso && getTurmaSerieKey(t) === "outra"
      );

  const filteredAlunos = alunosData.filter((aluno) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (aluno.nome ?? "").toLowerCase().includes(searchLower) ||
      (aluno.matricula ?? "").toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;
    if (selectedCurso === "todos") return true;

    const { cursoAluno, serieAluno } = getAlunoCursoESerie(aluno);
    if (cursoAluno !== selectedCurso) return false;

    if (selectedSerie === "todo_curso") return true;
    if (selectedSerie.startsWith("turma:")) {
      return aluno.turmaId === selectedSerie.replace("turma:", "");
    }

    return serieAluno === selectedSerie;
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
            {isGestor && (
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
            )}
          </div>

          {/* Search e Filtro por Curso / Série (estilo Armários) */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou matrícula..."
                  className="pl-10 h-11 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Botões de Filtro por Curso */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant={selectedCurso === "todos" ? "default" : "outline"}
                  onClick={() => handleSelectCurso("todos")}
                  className="rounded-xl h-9 text-xs"
                >
                  Todos os Cursos ({alunosData.length})
                </Button>
                {cursosPrincipais.map((c) => (
                  <Button
                    key={c.key}
                    size="sm"
                    variant={selectedCurso === c.key ? "default" : "outline"}
                    onClick={() => handleSelectCurso(c.key)}
                    className="rounded-xl h-9 text-xs"
                  >
                    {c.label} ({countCurso(c.key)})
                  </Button>
                ))}
                {countOutrosCursos > 0 && (
                  <Button
                    size="sm"
                    variant={selectedCurso === "outros" ? "default" : "outline"}
                    onClick={() => handleSelectCurso("outros")}
                    className="rounded-xl h-9 text-xs"
                  >
                    Outras Turmas ({countOutrosCursos})
                  </Button>
                )}
              </div>
            </div>

            {/* Sub-filtro de Série / Ano quando um curso é selecionado */}
            {selectedCurso !== "todos" && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-muted/40 border border-border/60 animate-fade-in">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Ano / Turma:
                </span>
                {[
                  { key: "todo_curso", label: `Todo o Curso (${alunosDoCursoSelecionado.length})` },
                  { key: "1", label: `1º Ano (${countSerie("1")})` },
                  { key: "2", label: `2º Ano (${countSerie("2")})` },
                  { key: "3", label: `3º Ano (${countSerie("3")})` },
                  ...turmasOutrasDoCurso.map((t) => ({
                    key: `turma:${t.id}`,
                    label: `${t.nome} (${t.totalAlunos})`,
                  })),
                ].map((s) => (
                  <Button
                    key={s.key}
                    size="sm"
                    variant={selectedSerie === s.key ? "default" : "outline"}
                    onClick={() => handleSelectSerie(s.key)}
                    className="rounded-xl h-8 text-xs"
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Barra de Ações Rápidas de Seleção */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            {isGestor ? (
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
            ) : (
              <span>Modo visualização e empréstimo de chaves</span>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-7 px-2 text-xs gap-1.5 rounded-lg"
                title="Atualizar lista de alunos do banco"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <span>Total: {filteredAlunos.length} alunos</span>
            </div>
          </div>

          {/* Tabela com Rolagem Interna e Cabeçalho Sticky (Requisito 7) */}
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
            <div className="max-h-[520px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                  <TableRow>
                    {isGestor && (
                      <TableHead className="w-[50px] text-center">
                        <Checkbox
                          checked={
                            filteredAlunos.length > 0 &&
                            selectedAlunoIds.length === filteredAlunos.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Armário Atual</TableHead>
                    <TableHead className="text-right w-[190px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Carregando alunos...
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        <div className="flex flex-col items-center gap-2 text-destructive">
                          <AlertCircle className="h-6 w-6" />
                          <p className="font-medium text-sm">
                            Erro ao carregar alunos: {(error as Error)?.message || "Falha de comunicação com o servidor"}
                          </p>
                          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl mt-1">
                            Tentar novamente
                          </Button>
                        </div>
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
                          className={`hover:bg-muted/40 transition-colors ${isSelected ? "bg-primary/5" : ""
                            }`}
                        >
                          {isGestor && (
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectAluno(aluno.id)}
                              />
                            </TableCell>
                          )}

                          <TableCell className="font-semibold text-foreground">
                            <div>{aluno.nome}</div>
                            {aluno.observacao && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                <StickyNote className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[190px]" title={aluno.observacao}>
                                  {aluno.observacao}
                                </span>
                              </div>
                            )}
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
                              {/* Atribuir Armário */}
                              {isGestor && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={temArmario}
                                  className={`h-8 w-8 rounded-lg ${temArmario
                                      ? "text-muted-foreground opacity-35 cursor-not-allowed"
                                      : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                    }`}
                                  onClick={() => setAlunoParaArmario(aluno)}
                                  title={
                                    temArmario
                                      ? `Aluno já possui o armário ${aluno.armario}`
                                      : "Atribuir armário para este aluno"
                                  }
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              )}

                              {/* 6.1. Atalho Emprestar Chave (disponível para Gestor e Atendente) */}
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

                              {isGestor && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 rounded-lg ${aluno.observacao
                                        ? "text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
                                        : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                      }`}
                                    onClick={() => {
                                      setAlunoParaObservacao(aluno);
                                      setObservacaoTexto(aluno.observacao || "");
                                    }}
                                    title={aluno.observacao ? `Observação: ${aluno.observacao}` : "Adicionar observação"}
                                  >
                                    <StickyNote className="h-4 w-4" />
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
                                    onClick={() => {
                                      setAlunoParaExcluir(aluno);
                                      setEtapaExcluirAluno(1);
                                    }}
                                    title="Excluir aluno"
                                  >
                                    <Trash2 className="h-4 w-4" />
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

          <EditarAlunoDialog
            aluno={editingAluno}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />

          <AtribuirArmarioAlunoModal
            aluno={alunoParaArmario}
            open={!!alunoParaArmario}
            onOpenChange={(val) => !val && setAlunoParaArmario(null)}
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

      {/* Modal de Observação do Aluno */}
      <Dialog open={!!alunoParaObservacao} onOpenChange={(val) => !val && setAlunoParaObservacao(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="h-5 w-5 text-amber-600" />
              Observação — {alunoParaObservacao?.nome}
            </DialogTitle>
            <DialogDescription>
              Registre avisos ou informações importantes sobre este aluno (ex: pendência de chave, autorização, troca solicitada).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="obs-aluno" className="text-xs font-semibold text-muted-foreground">
              Observação
            </Label>
            <Textarea
              id="obs-aluno"
              placeholder="Ex: Aluno perdeu a chave reserva, aguardando retorno..."
              className="rounded-xl min-h-[100px]"
              value={observacaoTexto}
              onChange={(e) => setObservacaoTexto(e.target.value)}
            />
          </div>

          <DialogFooter className="flex flex-wrap justify-between gap-2">
            {alunoParaObservacao?.observacao && (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 mr-auto"
                disabled={observacaoMutation.isPending}
                onClick={() =>
                  observacaoMutation.mutate({
                    id: alunoParaObservacao.id,
                    observacao: "",
                  })
                }
              >
                Remover Observação
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setAlunoParaObservacao(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (alunoParaObservacao) {
                    observacaoMutation.mutate({
                      id: alunoParaObservacao.id,
                      observacao: observacaoTexto,
                    });
                  }
                }}
                disabled={observacaoMutation.isPending}
                className="rounded-xl font-medium"
              >
                {observacaoMutation.isPending ? "Salvando..." : "Salvar Observação"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação em duas etapas de Exclusão de Aluno */}
      <AlertDialog
        open={!!alunoParaExcluir}
        onOpenChange={(val) => {
          if (!val) {
            setAlunoParaExcluir(null);
            setEtapaExcluirAluno(1);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {etapaExcluirAluno === 1
                ? "Excluir Aluno"
                : "Confirmação Final — Excluir Aluno?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {etapaExcluirAluno === 1 ? (
                <>
                  Deseja remover o aluno <strong>{alunoParaExcluir?.nome}</strong> (Matrícula: {alunoParaExcluir?.matricula})?
                  <br /><br />
                  <span className="text-xs text-muted-foreground">
                    * O armário vinculado será automaticamente liberado e o histórico de sorteios e movimentações será mantido no sistema para fins de auditoria.
                  </span>
                </>
              ) : (
                <>
                  Tem <strong>certeza absoluta</strong> de que deseja excluir <strong>{alunoParaExcluir?.nome}</strong>?
                  {alunoParaExcluir?.armario && (
                    <> O armário <strong>{alunoParaExcluir.armario}</strong> será liberado imediatamente.</>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            {etapaExcluirAluno === 1 ? (
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={() => setEtapaExcluirAluno(2)}
              >
                Continuar
              </Button>
            ) : (
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-bold"
                onClick={() => {
                  if (alunoParaExcluir) {
                    deleteMutation.mutate(alunoParaExcluir.id);
                    setEtapaExcluirAluno(1);
                  }
                }}
              >
                Sim, excluir aluno
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
