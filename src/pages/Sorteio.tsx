import { useState, useEffect } from "react";
import { 
  Shuffle, 
  Plus, 
  Trash2, 
  Users, 
  Archive, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Download, 
  Search,
  GraduationCap,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, GrupoSorteio, AlunoItem, TurmaItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const prefixosDisponiveis = ["A", "B", "C", "D", "E", "F"];

export default function Sorteio() {
  const { isGestor } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Nome do Sorteio
  const [nomeSorteio, setNomeSorteio] = useState("Sorteio Letivo 2024");
  
  // Grupos de Armários combináveis (Requisito 4.2)
  const [grupos, setGrupos] = useState<GrupoSorteio[]>([
    { prefixo: "A", inicio: 1, fim: 30 },
  ]);

  // Alunos participantes no sorteio (Requisito 5)
  const [participantes, setParticipantes] = useState<Array<{ id: string; nome: string; matricula: string; turma: string }>>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("todas");
  const [alunoSearchTerm, setAlunoSearchTerm] = useState("");

  // Resultados
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [etapaSorteio, setEtapaSorteio] = useState<1 | 2>(1);
  const [resultados, setResultados] = useState<any[]>([]);
  const [resultadoSearch, setResultadoSearch] = useState("");

  // Carrega turmas do banco
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
  });

  // Carrega alunos sem armário
  const { data: todosAlunos = [] } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api.getAlunos(),
  });

  // Se veio da tela de Alunos com alunos pré-selecionados via navegação
  useEffect(() => {
    const stateAlunos = (location.state as any)?.alunosSelecionados;
    if (Array.isArray(stateAlunos) && stateAlunos.length > 0) {
      setParticipantes(stateAlunos);
      toast.info(`${stateAlunos.length} alunos carregados para o sorteio!`);
    } else {
      // Por padrão, carrega alunos sem armário
      const semArmario = todosAlunos.filter((a) => !a.armario);
      if (semArmario.length > 0 && participantes.length === 0) {
        setParticipantes(
          semArmario.map((a) => ({
            id: a.id,
            nome: a.nome,
            matricula: a.matricula,
            turma: a.turma || "—",
          }))
        );
      }
    }
  }, [todosAlunos, location.state]);

  // Prévia dinâmica de armários livres combinados (Requisito 4.2)
  const previewMutation = useMutation({
    mutationFn: () =>
      api.previewSorteioMulti({
        grupos,
        alunoIds: participantes.map((p) => p.id),
      }),
  });

  // Atualiza prévia quando grupos ou participantes mudarem
  useEffect(() => {
    if (grupos.length > 0 && participantes.length > 0) {
      previewMutation.mutate();
    }
  }, [grupos, participantes.length]);

  // Execução do sorteio com transação atômica
  const executarMutation = useMutation({
    mutationFn: () =>
      api.executarSorteioMulti({
        nomeSorteio,
        grupos,
        alunoIds: participantes.map((p) => p.id),
      }),
    onSuccess: (data) => {
      toast.success(data.message || "Sorteio executado com sucesso!");
      setResultados(data.resultados || []);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao executar sorteio");
    },
  });

  // Gerenciamento dos grupos de prefixos
  const addGrupo = () => {
    const nextPrefixo = prefixosDisponiveis[grupos.length % prefixosDisponiveis.length];
    setGrupos([...grupos, { prefixo: nextPrefixo, inicio: 1, fim: 20 }]);
  };

  const removeGrupo = (index: number) => {
    if (grupos.length <= 1) {
      toast.error("É necessário ter ao menos um grupo de armários.");
      return;
    }
    setGrupos(grupos.filter((_, i) => i !== index));
  };

  const updateGrupo = (index: number, field: keyof GrupoSorteio, value: any) => {
    const newGrupos = [...grupos];
    newGrupos[index] = { ...newGrupos[index], [field]: value };
    setGrupos(newGrupos);
  };

  // Carregar alunos de uma turma específica
  const handleCarregarPorTurma = (turmaId: string) => {
    setTurmaSelecionada(turmaId);
    if (turmaId === "todas") {
      const semArmario = todosAlunos.filter((a) => !a.armario);
      setParticipantes(
        semArmario.map((a) => ({
          id: a.id,
          nome: a.nome,
          matricula: a.matricula,
          turma: a.turma || "—",
        }))
      );
    } else {
      const daTurma = todosAlunos.filter((a) => a.turmaId === turmaId && !a.armario);
      setParticipantes(
        daTurma.map((a) => ({
          id: a.id,
          nome: a.nome,
          matricula: a.matricula,
          turma: a.turma || "—",
        }))
      );
    }
  };

  // Remover aluno da lista de sorteio (Requisito 5: Não afeta o cadastro)
  const removeParticipante = (id: string) => {
    setParticipantes(participantes.filter((p) => p.id !== id));
  };

  const previa = previewMutation.data;
  const totalVagas = previa?.totalArmariosLivres ?? 0;
  const totalAlunos = participantes.length;
  const temArmariosSuficientes = totalVagas >= totalAlunos;

  const filteredResultados = resultados.filter((r) =>
    r.aluno.toLowerCase().includes(resultadoSearch.toLowerCase()) ||
    r.armario.toLowerCase().includes(resultadoSearch.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
                <Shuffle className="h-7 w-7 text-primary" />
                Sorteio Inteligente de Armários
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Configure múltiplos prefixos e intervalos combinados e realize a distribuição segura para alunos.
              </p>
            </div>
            {resultados.length > 0 && (
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="rounded-2xl gap-2 font-medium"
              >
                <Printer className="h-4 w-4" />
                Imprimir Resultado
              </Button>
            )}
          </div>

          {/* Se houver resultados, mostra a tela de resultados em destaque */}
          {resultados.length > 0 ? (
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-6 animate-scale-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <Badge className="bg-emerald-600 text-white mb-2">Sorteio Concluído</Badge>
                  <h2 className="text-2xl font-bold text-foreground">{nomeSorteio}</h2>
                  <p className="text-sm text-muted-foreground">
                    {resultados.length} alunos foram contemplados e vinculados aos seus armários com sucesso.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setResultados([]);
                    previewMutation.mutate();
                  }}
                  variant="outline"
                  className="rounded-xl"
                >
                  Configurar Novo Sorteio
                </Button>
              </div>

              {/* Busca nos resultados */}
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por aluno ou armário sorteado..."
                  className="pl-10 h-10 rounded-xl"
                  value={resultadoSearch}
                  onChange={(e) => setResultadoSearch(e.target.value)}
                />
              </div>

              {/* Tabela de Resultados com Rolagem Interna */}
              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="max-h-[460px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>Aluno Contemplado</TableHead>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Armário Sorteado</TableHead>
                        <TableHead className="text-right">Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResultados.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/40">
                          <TableCell className="font-bold text-foreground">{item.aluno}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{item.matricula || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{item.turma || "—"}</TableCell>
                          <TableCell>
                            <Badge className="bg-primary text-primary-foreground font-bold text-sm px-3 py-1">
                              {item.armario}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {new Date(item.data).toLocaleString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Coluna Esquerda: Configuração de Grupos de Armários (4.1 e 4.2) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                      1
                    </span>
                    Identificação & Grupos de Armários
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Nome do Sorteio</Label>
                    <Input
                      value={nomeSorteio}
                      onChange={(e) => setNomeSorteio(e.target.value)}
                      placeholder="Ex: Sorteio de Início de Ano 2024"
                      className="rounded-xl h-11"
                    />
                  </div>

                  {/* Lista de Grupos de Armários Combináveis */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Armários Livres por Bloco / Intervalo
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addGrupo}
                        className="text-xs text-primary gap-1 h-7"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar Outro Bloco
                      </Button>
                    </div>

                    {grupos.map((grupo, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-muted/30 border border-border rounded-2xl flex items-center gap-3 animate-fade-in"
                      >
                        <div className="w-28 space-y-1">
                          <span className="text-[11px] text-muted-foreground">Bloco</span>
                          <Select
                            value={grupo.prefixo}
                            onValueChange={(val) => updateGrupo(idx, "prefixo", val)}
                          >
                            <SelectTrigger className="h-9 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {prefixosDisponiveis.map((p) => (
                                <SelectItem key={p} value={p}>
                                  Bloco {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex-1 space-y-1">
                          <span className="text-[11px] text-muted-foreground">Início</span>
                          <Input
                            type="number"
                            min="1"
                            value={grupo.inicio}
                            onChange={(e) => updateGrupo(idx, "inicio", e.target.value)}
                            className="h-9 rounded-lg"
                          />
                        </div>

                        <div className="flex-1 space-y-1">
                          <span className="text-[11px] text-muted-foreground">Fim</span>
                          <Input
                            type="number"
                            min="1"
                            value={grupo.fim}
                            onChange={(e) => updateGrupo(idx, "fim", e.target.value)}
                            className="h-9 rounded-lg"
                          />
                        </div>

                        {grupos.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeGrupo(idx)}
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg mt-4 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resumo da Disponibilidade Combinada */}
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total de Armários Livres Encontrados:</span>
                      <strong className="text-lg font-bold text-primary">{totalVagas}</strong>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      * Armários ocupados dentro do intervalo são descartados automaticamente pelo algoritmo de sorteio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Seleção de Alunos Participantes (Requisito 4.3 e 5) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                      <span className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm">
                        2
                      </span>
                      Alunos Participantes ({participantes.length})
                    </div>
                  </div>

                  {/* Filtro Rápido por Turma */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Carregar Alunos por Turma</Label>
                    <Select value={turmaSelecionada} onValueChange={handleCarregarPorTurma}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Selecione para carregar a turma inteira" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todos os Alunos sem Armário</SelectItem>
                        {turmas.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome} ({t.totalAlunos} alunos)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lista de Participantes com Rolagem Interna */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Lista de Sorteio (Não altera cadastro oficial)</span>
                      <span>{participantes.length} na fila</span>
                    </div>

                    <div className="max-h-[260px] overflow-y-auto border border-border rounded-2xl p-2 space-y-1 divide-y divide-border/40 bg-muted/10">
                      {participantes.length === 0 ? (
                        <p className="p-6 text-center text-xs text-muted-foreground">
                          Nenhum aluno adicionado ao sorteio.
                        </p>
                      ) : (
                        participantes.map((aluno) => (
                          <div
                            key={aluno.id}
                            className="p-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">{aluno.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                Matrícula: {aluno.matricula} • Turma: {aluno.turma}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeParticipante(aluno.id)}
                              className="text-muted-foreground hover:text-destructive h-7 text-xs"
                              title="Retirar aluno apenas deste sorteio"
                            >
                              Remover
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Verificação de Balanço Vagas vs Participantes (Requisito 4.3) */}
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                      temArmariosSuficientes
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {temArmariosSuficientes ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Vagas Suficientes ({totalVagas} armários para {totalAlunos} alunos)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Armários Insuficientes ({totalVagas} livres para {totalAlunos} participantes)
                        </>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90">
                      {temArmariosSuficientes
                        ? `Sobrarão ${totalVagas - totalAlunos} armários disponíveis para próximos sorteios.`
                        : `Apenas os primeiros ${totalVagas} alunos sorteados serão contemplados. Considere adicionar mais blocos.`}
                    </p>
                  </div>

                  {/* Botão de Disparo do Sorteio */}
                  <Button
                    size="lg"
                    disabled={!isGestor || totalVagas === 0 || totalAlunos === 0 || previewMutation.isPending}
                    onClick={() => {
                      setEtapaSorteio(1);
                      setConfirmOpen(true);
                    }}
                    className="w-full rounded-2xl h-12 shadow-lg shadow-primary/20 hover:shadow-xl font-bold gap-2 text-base"
                  >
                    <Sparkles className="h-5 w-5" />
                    {isGestor ? "Revisar & Executar Sorteio" : "Disponível apenas para Coordenador/Admin"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dupla Confirmação do Sorteio antes de efetivar (Requisito 4.4) */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(val) => {
          setConfirmOpen(val);
          if (!val) setEtapaSorteio(1);
        }}
      >
        <AlertDialogContent className="rounded-3xl max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-6 w-6 text-primary" />
              {etapaSorteio === 1
                ? "Confirmar Sorteio de Armários"
                : "Confirmação Final — Executar Sorteio Agora?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-sm text-muted-foreground">
                {etapaSorteio === 1 ? (
                  <>
                    <p>
                      Você está prestes a realizar o sorteio <strong>"{nomeSorteio}"</strong>.
                    </p>
                    <div className="p-3 bg-muted/40 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Alunos participantes:</span>
                        <strong className="text-foreground">{totalAlunos}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Armários livres disponíveis:</span>
                        <strong className="text-foreground">{totalVagas}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Alunos que serão contemplados:</span>
                        <strong className="text-emerald-600 font-bold">
                          {Math.min(totalAlunos, totalVagas)}
                        </strong>
                      </div>
                    </div>
                    <p className="text-xs">
                      Após a confirmação, os armários sorteados mudarão imediatamente para <strong>Ocupado</strong> e
                      ficarão vinculados aos alunos.
                    </p>
                  </>
                ) : (
                  <p>
                    Tem <strong>certeza absoluta</strong> de que deseja sortear e vincular{" "}
                    <strong>{Math.min(totalAlunos, totalVagas)} armário(s)</strong> agora no sorteio{" "}
                    <strong>"{nomeSorteio}"</strong>?
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            {etapaSorteio === 1 ? (
              <Button
                className="rounded-xl font-bold"
                onClick={() => setEtapaSorteio(2)}
              >
                Continuar para Confirmação
              </Button>
            ) : (
              <AlertDialogAction
                onClick={() => executarMutation.mutate()}
                disabled={executarMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold gap-2"
              >
                {executarMutation.isPending ? "Sorteando..." : "Sim, Efetivar Sorteio"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
