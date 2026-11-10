import { useState, useEffect } from "react";
import { UserPlus, Search, UserCheck, GraduationCap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, ArmarioItem } from "@/lib/api";
import { toast } from "sonner";

interface DistribuirArmarioModalProps {
  armario: ArmarioItem;
}

export function DistribuirArmarioModal({ armario }: DistribuirArmarioModalProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("todas");
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setSelectedTurmaId("todas");
      setSelectedAlunoId(null);
    }
  }, [open]);

  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => api.getAlunos(),
    enabled: open,
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
    enabled: open,
  });

  const distribuirMutation = useMutation({
    mutationFn: () => api.distribuirArmario(armario.id, selectedAlunoId!),
    onSuccess: (data) => {
      toast.success(data.message || `Armário ${armario.numero} distribuído!`);
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setOpen(false);
      setSelectedAlunoId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao distribuir armário");
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
    },
  });

  // Filtra apenas alunos SEM armário
  const alunosSemArmario = alunos.filter((a) => !a.armarioId && !a.armario);

  const countSemArmarioNaTurma = (turmaId: string) =>
    alunosSemArmario.filter((a) => a.turmaId === turmaId).length;

  const filteredAlunos = alunosSemArmario.filter((a) => {
    const matchesTurma =
      selectedTurmaId === "todas" || a.turmaId === selectedTurmaId;
    if (!matchesTurma) return false;

    const searchLower = searchTerm.toLowerCase();
    return (
      (a.nome ?? "").toLowerCase().includes(searchLower) ||
      (a.matricula ?? "").toLowerCase().includes(searchLower)
    );
  });

  const selectedAlunoObj = alunos.find((a) => a.id === selectedAlunoId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
          title="Distribuir armário livre para um aluno"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Distribuir
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            Distribuir Armário {armario.numero}
          </DialogTitle>
          <DialogDescription>
            Pesquise e selecione o aluno que receberá este armário. Alunos que já possuem armário ativo não podem receber outro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 my-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary shrink-0" />
            <Select
              value={selectedTurmaId}
              onValueChange={(val) => {
                setSelectedTurmaId(val);
                setSelectedAlunoId(null);
              }}
            >
              <SelectTrigger className="h-10 rounded-xl flex-1">
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">
                  Todas as Turmas ({alunosSemArmario.length} disponíveis)
                </SelectItem>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} ({countSemArmarioNaTurma(t.id)} sem armário)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou matrícula..."
              className="pl-9 h-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[240px] overflow-y-auto border border-border rounded-xl p-2 space-y-1 divide-y divide-border/50">
          {isLoading ? (
            <p className="p-4 text-center text-xs text-muted-foreground">Carregando alunos sem armário...</p>
          ) : filteredAlunos.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {searchTerm ? "Nenhum aluno encontrado para a busca." : "Todos os alunos já possuem armário atribuído."}
            </p>
          ) : (
            filteredAlunos.map((aluno) => {
              const isSelected = selectedAlunoId === aluno.id;
              return (
                <div
                  key={aluno.id}
                  onClick={() => setSelectedAlunoId(aluno.id)}
                  className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{aluno.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Matrícula: {aluno.matricula} • Turma: {aluno.turma}
                    </p>
                  </div>
                  {isSelected && (
                    <Badge className="bg-emerald-600 text-white gap-1 text-[11px] h-5">
                      <UserCheck className="h-3 w-3" /> Selecionado
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>

        {selectedAlunoObj && (
          <div className="p-3 bg-muted/30 border border-border rounded-xl text-xs flex justify-between items-center">
            <span>Aluno escolhido:</span>
            <span className="font-bold text-foreground">{selectedAlunoObj.nome}</span>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={() => distribuirMutation.mutate()}
            disabled={!selectedAlunoId || distribuirMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
          >
            {distribuirMutation.isPending ? "Distribuindo..." : "Confirmar Distribuição"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

