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
  FileSpreadsheet
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

  const { data: stats } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: api.getDashboardStats,
  });

  const totalArmarios = stats?.totalArmarios ?? 0;
  const armariosDisponiveis = stats?.armariosDisponiveis ?? 0;
  const armariosOcupados = stats?.armariosOcupados ?? 0;
  const totalAlunos = stats?.totalAlunos ?? 0;
  const taxaOcupacao = totalArmarios > 0 ? Math.round((armariosOcupados / totalArmarios) * 100) : 0;

  const handleExport = (exportFn: () => void, name: string) => {
    try {
      exportFn();
      toast({
        title: "Relatório exportado!",
        description: `${name} foi gerado com sucesso.`,
      });
    } catch {
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o relatório.",
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
            <p className="text-muted-foreground">Gere e exporte relatórios do sistema</p>
          </div>

          {/* Filtros */}
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
                  <label className="text-sm font-medium text-foreground">Período</label>
                  <Select defaultValue="mes">
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semana">Última semana</SelectItem>
                      <SelectItem value="mes">Último mês</SelectItem>
                      <SelectItem value="trimestre">Último trimestre</SelectItem>
                      <SelectItem value="ano">Último ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Turma</label>
                  <Select defaultValue="todas">
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as turmas</SelectItem>
                      <SelectItem value="1a">1º Ano A</SelectItem>
                      <SelectItem value="1b">1º Ano B</SelectItem>
                      <SelectItem value="2a">2º Ano A</SelectItem>
                      <SelectItem value="3a">3º Ano A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <Select defaultValue="todos">
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
                  <Button className="w-full rounded-2xl">
                    Aplicar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Estatísticas Rápidas - Adaptados para Modo Claro e Escuro */}
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
                      Lista completa de armários com status e responsáveis
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportArmariosRelatorio('pdf'), 'Relatório de Armários PDF')}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportArmariosRelatorio('excel'), 'Relatório de Armários Excel')}
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
                      Lista de alunos com armários atribuídos
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportAlunosRelatorio('pdf'), 'Relatório de Alunos PDF')}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportAlunosRelatorio('excel'), 'Relatório de Alunos Excel')}
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
                      Distribuição de armários por turma
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportTurmasRelatorio('pdf'), 'Relatório por Turma PDF')}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportTurmasRelatorio('excel'), 'Relatório por Turma Excel')}
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
                      Registro de todos os sorteios realizados
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl gap-2"
                      onClick={() => handleExport(exportHistoricoSorteios, 'Histórico de Sorteios PDF')}
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
                      Análise de ocupação ao longo do tempo
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportOcupacaoRelatorio('pdf'), 'Relatório de Ocupação PDF')}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-2"
                        onClick={() => handleExport(() => exportOcupacaoRelatorio('excel'), 'Relatório de Ocupação Excel')}
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
                      Lista de armários livres para atribuição
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl gap-2"
                      onClick={() => handleExport(exportArmariosDisponiveis, 'Armários Disponíveis PDF')}
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
