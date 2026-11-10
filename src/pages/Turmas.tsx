import { useState } from "react";
import { Plus, Search, Users, GraduationCap, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetalhesTurmaModal } from "@/components/DetalhesTurmaModal";
import { PromocaoSeletivaDialog } from "@/components/PromocaoSeletivaDialog";
import { api, TurmaItem } from "@/lib/api";
import { toast } from "sonner";

export default function Turmas() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nomeTurma, setNomeTurma] = useState("");
  const [anoLetivo, setAnoLetivo] = useState("2024");
  const [curso, setCurso] = useState("Ensino Regular");
  const [serie, setSerie] = useState("Ensino Fundamental");
  const [turno, setTurno] = useState("Manhã");

  // Estados para Edição de Turma
  const [editingTurma, setEditingTurma] = useState<TurmaItem | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editAnoLetivo, setEditAnoLetivo] = useState("");
  const [editCurso, setEditCurso] = useState("");
  const [editSerie, setEditSerie] = useState("");
  const [editTurno, setEditTurno] = useState("Manhã");

  const { data: turmasData = [], isLoading } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
  });

  const createTurmaMutation = useMutation({
    mutationFn: api.createTurma,
    onSuccess: () => {
      toast.success("Turma criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setNomeTurma("");
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar turma");
    },
  });

  const updateTurmaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { nome: string; anoLetivo?: string; curso?: string; serie?: string; turno?: string } }) =>
      api.updateTurma(id, data),
    onSuccess: () => {
      toast.success("Turma atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["turma-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["chaves"] });
      setEditingTurma(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar turma");
    },
  });

  const openEditDialog = (turma: TurmaItem) => {
    setEditingTurma(turma);
    setEditNome(turma.nome);
    setEditAnoLetivo(turma.anoLetivo || "2024");
    setEditCurso(turma.curso || "Ensino Regular");
    setEditSerie(turma.serie || "Geral");
    setEditTurno(turma.turno || "Manhã");
  };

  const handleUpdateTurma = () => {
    if (!editingTurma) return;
    if (!editNome.trim()) {
      toast.error("Informe o nome da turma");
      return;
    }
    updateTurmaMutation.mutate({
      id: editingTurma.id,
      data: {
        nome: editNome.trim(),
        anoLetivo: editAnoLetivo.trim(),
        curso: editCurso.trim(),
        serie: editSerie.trim(),
        turno: editTurno,
      },
    });
  };

  const filteredTurmas = turmasData.filter((turma) =>
    turma.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAlunos = turmasData.reduce((acc, turma) => acc + turma.totalAlunos, 0);

  const handleCreateTurma = () => {
    if (!nomeTurma.trim()) {
      toast.error("Informe o nome da turma");
      return;
    }
    createTurmaMutation.mutate({ nome: nomeTurma, anoLetivo, curso, serie, turno });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Gerenciamento de Turmas</h1>
              <p className="text-muted-foreground mt-1.5">
                Crie turmas, consulte listas de alunos e realize promoções seletivas com segurança.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <PromocaoSeletivaDialog />

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all font-medium">
                    <Plus className="h-5 w-5 mr-2" />
                    Nova Turma
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px] rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Criar Nova Turma</DialogTitle>
                    <DialogDescription>
                      Preencha as informações para cadastrar uma nova turma no sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nome" className="font-medium">Nome da Turma</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: 9º Ano A ou 1º Ano de Informática"
                        className="rounded-xl h-11"
                        value={nomeTurma}
                        onChange={(e) => setNomeTurma(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="curso" className="font-medium">Curso</Label>
                        <Input
                          id="curso"
                          placeholder="Ex: Informática / Regular"
                          className="rounded-xl h-11"
                          value={curso}
                          onChange={(e) => setCurso(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="turno" className="font-medium">Turno</Label>
                        <Select value={turno} onValueChange={setTurno}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Manhã">Manhã</SelectItem>
                            <SelectItem value="Tarde">Tarde</SelectItem>
                            <SelectItem value="Noite">Noite</SelectItem>
                            <SelectItem value="Integral">Integral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="serie" className="font-medium">Série / Período</Label>
                        <Input
                          id="serie"
                          placeholder="Ex: 1º Ano / 9º Ano"
                          className="rounded-xl h-11"
                          value={serie}
                          onChange={(e) => setSerie(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ano" className="font-medium">Ano Letivo</Label>
                        <Input
                          id="ano"
                          placeholder="Ex: 2024"
                          className="rounded-xl h-11"
                          value={anoLetivo}
                          onChange={(e) => setAnoLetivo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateTurma}
                      disabled={createTurmaMutation.isPending}
                      className="rounded-xl font-medium"
                    >
                      {createTurmaMutation.isPending ? "Salvando..." : "Criar Turma"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Turmas</p>
                  <p className="text-3xl font-bold text-foreground">{turmasData.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                  <Users className="h-7 w-7 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Alunos</p>
                  <p className="text-3xl font-bold text-foreground">{totalAlunos}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Média por Turma</p>
                  <p className="text-3xl font-bold text-foreground">
                    {turmasData.length > 0 ? Math.round(totalAlunos / turmasData.length) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar turma por nome..."
              className="pl-12 h-12 rounded-2xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <p className="text-center py-12 text-muted-foreground">Carregando turmas...</p>
          ) : filteredTurmas.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Nenhuma turma cadastrada no banco.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredTurmas.map((turma) => (
                <div
                  key={turma.id}
                  className="bg-card rounded-3xl border border-border p-6 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-primary" />
                      </div>

                      {/* Botões de Ação (Visualizar Alunos e Editar Turma) */}
                      <div className="flex items-center gap-1">
                        <DetalhesTurmaModal turmaId={turma.id} turmaNome={turma.nome} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(turma)}
                          title="Editar turma"
                          className="rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-foreground mb-1">{turma.nome}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <span>Ano {turma.anoLetivo}</span>
                      <span>•</span>
                      <span>{turma.turno || "Manhã"}</span>
                      {turma.curso && (
                        <>
                          <span>•</span>
                          <span>{turma.curso}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-medium">{turma.totalAlunos} alunos</span>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {turma.armariosOcupados} armários ocupados
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dialog de Edição de Turma */}
          <Dialog open={!!editingTurma} onOpenChange={(open) => !open && setEditingTurma(null)}>
            <DialogContent className="sm:max-w-[480px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" />
                  Editar Turma
                </DialogTitle>
                <DialogDescription>
                  Altere o nome, ano letivo, curso, série ou turno da turma selecionada.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-nome" className="font-medium">Nome da Turma</Label>
                  <Input
                    id="edit-nome"
                    placeholder="Ex: 9º Ano A ou 1º Ano de Informática"
                    className="rounded-xl h-11"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-curso" className="font-medium">Curso</Label>
                    <Input
                      id="edit-curso"
                      placeholder="Ex: Informática / Regular"
                      className="rounded-xl h-11"
                      value={editCurso}
                      onChange={(e) => setEditCurso(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-turno" className="font-medium">Turno</Label>
                    <Select value={editTurno} onValueChange={setEditTurno}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manhã">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noite">Noite</SelectItem>
                        <SelectItem value="Integral">Integral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-serie" className="font-medium">Série / Período</Label>
                    <Input
                      id="edit-serie"
                      placeholder="Ex: 1º Ano / 9º Ano"
                      className="rounded-xl h-11"
                      value={editSerie}
                      onChange={(e) => setEditSerie(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-ano" className="font-medium">Ano Letivo</Label>
                    <Input
                      id="edit-ano"
                      placeholder="Ex: 2024"
                      className="rounded-xl h-11"
                      value={editAnoLetivo}
                      onChange={(e) => setEditAnoLetivo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTurma(null)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateTurma}
                  disabled={updateTurmaMutation.isPending}
                  className="rounded-xl font-medium"
                >
                  {updateTurmaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
