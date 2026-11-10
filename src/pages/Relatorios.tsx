import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  BarChart3,
  Users,
  Archive,
  Calendar,
  TrendingUp,
  PieChart,
  FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  exportArmariosRelatorio,
  exportAlunosRelatorio,
  exportTurmasRelatorio,
  exportOcupacaoRelatorio,
  exportArmariosDisponiveis,
  exportHistoricoSorteios,
} from "@/lib/exportUtils";

const Relatorios = () => {
  const { toast } = useToast();

  const [periodoFilter, setPeriodoFilter] = useState("todos");
  const [turmaFilter, setTurmaFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data: stats } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: api.getDashboardStats,
  });

  const { data: armarios = [] } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
  });

  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api.getAlunos(),
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
  });

  const { data: historico } = useQuery({
    queryKey: ["relatoriosHistorico"],
    queryFn: api.getRelatoriosHistorico,
  });

  const totalArmarios = stats?.totalArmarios ?? armarios.length;
  const armariosDisponiveis = stats?.armariosDisponiveis ?? armarios.filter((a) => a.status === "livre").length;
  const armariosOcupados = stats?.armariosOcupados ?? armarios.filter((a) => a.status === "ocupado").length;
  const totalAlunos = stats?.totalAlunos ?? alunos.length;
  const taxaOcupacao = totalArmarios > 0 ? Math.round((armariosOcupados / totalArmarios) * 100) : 0;

  const isWithinPeriodo = (dateStr?: string | null) => {
    if (periodoFilter === "todos" || !dateStr) return true;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return true;
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (periodoFilter === "semana") return diffDays <= 7;
    if (periodoFilter === "mes") return diffDays <= 30;
    if (periodoFilter === "trimestre") return diffDays <= 90;
    if (periodoFilter === "ano") return diffDays <= 365;
    return true;
  };

  const turmaSelecionadaObj = turmas.find((t) => t.id === turmaFilter);

  const armariosFiltrados = armarios.filter((a) => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (turmaFilter !== "todas") {
      if (!turmaSelecionadaObj || a.turma !== turmaSelecionadaObj.nome) return false;
    }
    return true;
  });

  const alunosFiltrados = alunos.filter((a) => {
    if (turmaFilter !== "todas" && a.turmaId !== turmaFilter) return false;
    if (statusFilter === "livre" && a.armario) return false;
    if (statusFilter === "ocupado" && !a.armario) return false;
    return true;
  });

  const turmasFiltradas =
    turmaFilter === "todas" ? turmas : turmas.filter((t) => t.id === turmaFilter);

  const sorteiosFiltrados = (historico?.sorteios || []).filter((s) => {
    if (!isWithinPeriodo(s.createdAt)) return false;
    if (turmaFilter !== "todas" && turmaSelecionadaObj && s.turma !== turmaSelecionadaObj.nome) {
      return false;
    }
    return true;
  });

  const movimentacoesFiltradas = (historico?.movimentacoes || []).filter((m) =>
    isWithinPeriodo(m.createdAt)
  );

  const handleExport = (exportFn: () => void, name: string) => {
    try {
      exportFn();
      toast({
        title: "Relatório exportado!",
        description: `${name} foi gerado com os dados reais do sistema.`,
      });
    } catch (err: any) {
      toast({
        title: "Aviso ao exportar",
        description: err?.message || "Ocorreu um erro ao gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
            <p className="text-muted-foreground">
              Gere e exporte relatórios com os dados reais do sistema
            </p>
          </div>

          {/* Filtros Reais */}
          <Card className="rounded-3xl mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Período (Histórico)</label>
                  <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todo o período</SelectItem>
                      <SelectItem value="semana">Última semana</SelectItem>
                      <SelectItem value="mes">Último mês</SelectItem>
                      <SelectItem value="trimestre">Último trimestre</SelectItem>
                      <SelectItem value="ano">Último ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Turma</label>
                  <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as turmas</SelectItem>
                      {turmas.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome} ({t.totalAlunos} alunos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status do Armário</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="livre">Livre</SelectItem>
                      <SelectItem value="ocupado">Ocupado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl"
                    onClick={() => {
                      setPeriodoFilter("todos");
                      setTurmaFilter("todas");
                      setStatusFilter("todos");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Estatísticas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="rounded-3xl bg-primary/5 dark:bg-primary/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-2xl">
                    <Archive className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalArmarios}</p>
                    <p className="text-sm text-muted-foreground">Total Armários</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl">
                    <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{taxaOcupacao}%</p>
                    <p className="text-sm text-muted-foreground">Taxa Ocupação</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-2xl">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalAlunos}</p>
                    <p className="text-sm text-muted-foreground">Alunos Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl">
                    <PieChart className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{armariosDisponiveis}</p>
                    <p className="text-sm text-muted-foreground">Livres</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tipos de Relatórios */}
          <h2 className="text-xl font-semibold text-foreground mb-4">Exportar Relatórios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="rounded-3xl hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-2xl group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Relatório de Armários</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Lista completa ({armariosFiltrados.length}) com status, responsáveis e observações
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportArmariosRelatorio("pdf", armariosFiltrados),
                            "Relatório de Armários PDF"
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportArmariosRelatorio("excel", armariosFiltrados),
                            "Relatório de Armários Excel"
                          )
                        }
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950/50 rounded-2xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Relatório de Alunos</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Lista de alunos ({alunosFiltrados.length}) com turmas e armários atribuídos
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportAlunosRelatorio("pdf", alunosFiltrados),
                            "Relatório de Alunos PDF"
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportAlunosRelatorio("excel", alunosFiltrados),
                            "Relatório de Alunos Excel"
                          )
                        }
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                    <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Relatório por Turma</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Distribuição de alunos e armários por turma ({turmasFiltradas.length})
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportTurmasRelatorio("pdf", turmasFiltradas),
                            "Relatório por Turma PDF"
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportTurmasRelatorio("excel", turmasFiltradas),
                            "Relatório por Turma Excel"
                          )
                        }
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-100 dark:bg-violet-950/50 rounded-2xl group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                    <Calendar className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Histórico de Sorteios</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Registro de sorteios realizados ({sorteiosFiltrados.length})
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2"
                      onClick={() =>
                        handleExport(
                          () => exportHistoricoSorteios(sorteiosFiltrados),
                          "Histórico de Sorteios PDF"
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl group-hover:bg-rose-200 dark:group-hover:bg-rose-900/50 transition-colors">
                    <TrendingUp className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Relatório de Ocupação</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Taxa de ocupação real por bloco e histórico de movimentações
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportOcupacaoRelatorio("pdf", armarios, movimentacoesFiltradas),
                            "Relatório de Ocupação PDF"
                          )
                        }
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-2"
                        onClick={() =>
                          handleExport(
                            () => exportOcupacaoRelatorio("excel", armarios, movimentacoesFiltradas),
                            "Relatório de Ocupação Excel"
                          )
                        }
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-950/50 rounded-2xl group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
                    <Archive className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Armários Disponíveis</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Lista de armários livres ({armariosDisponiveis}) para atribuição
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2"
                      onClick={() =>
                        handleExport(
                          () => exportArmariosDisponiveis(armarios),
                          "Armários Disponíveis PDF"
                        )
                      }
                    >
                      <Download className="h-4 w-4" />
                      Exportar PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Relatorios;
