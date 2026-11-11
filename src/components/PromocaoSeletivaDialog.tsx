import { useState, useEffect } from "react";
import { ArrowRight, GraduationCap, CheckSquare, Square, Users, AlertTriangle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { api, TurmaItem } from "@/lib/api";
import { toast } from "sonner";

export function PromocaoSeletivaDialog() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [origemId, setOrigemId] = useState<string>("");
  const [destinoId, setDestinoId] = useState<string>("");
  const [selectedAlunos, setSelectedAlunos] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
    enabled: open,
  });

  const { data: turmaOrigemDetalhes, isLoading: loadingAlunos } = useQuery({
    queryKey: ["turmaDetalhes", origemId],
    queryFn: () => api.getTurmaDetalhes(origemId),
    enabled: !!origemId,
  });

  // Quando trocar a turma de origem, pré-seleciona todos os alunos por padrão
  useEffect(() => {
    if (turmaOrigemDetalhes?.alunos) {
      setSelectedAlunos(turmaOrigemDetalhes.alunos.map((a) => a.id));
    } else {
      setSelectedAlunos([]);
    }
  }, [turmaOrigemDetalhes]);

  const promocaoMutation = useMutation({
    mutationFn: api.promoverTurmaSeletivo,
    onSuccess: (data) => {
      toast.success(data.message || "Promoção seletiva realizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["turmaDetalhes"] });
      setOpen(false);
      setOrigemId("");
      setDestinoId("");
      setSelectedAlunos([]);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao realizar promoção");
    },
  });

  const alunosOrigem = turmaOrigemDetalhes?.alunos || [];
  const totalOrigem = alunosOrigem.length;
  const qtdPromovidos = selectedAlunos.length;
  const qtdRetidos = Math.max(0, totalOrigem - qtdPromovidos);
  const turmaDestinoObj = turmas.find((t) => t.id === destinoId);

  const toggleAluno = (id: string) => {
    setSelectedAlunos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedAlunos(alunosOrigem.map((a) => a.id));
  };

  const deselectAll = () => {
    setSelectedAlunos([]);
  };

  const handleConfirmar = () => {
    if (!origemId || !destinoId) {
      toast.error("Selecione a turma de origem e a turma de destino.");
      return;
    }
    if (origemId === destinoId) {
      toast.error("A turma de destino deve ser diferente da turma de origem.");
      return;
    }
    if (selectedAlunos.length === 0) {
      toast.error("Selecione ao menos um aluno para promover.");
      return;
    }

    promocaoMutation.mutate({
      turmaOrigemId: origemId,
      turmaDestinoId: destinoId,
      alunoIdsSelecionados: selectedAlunos,
    });
    setConfirmOpen(false);
  };

  const abrirConfirmacao = () => {
    if (!origemId || !destinoId) {
      toast.error("Selecione a turma de origem e a turma de destino.");
      return;
    }
    if (origemId === destinoId) {
      toast.error("A turma de destino deve ser diferente da turma de origem.");
      return;
    }
    if (selectedAlunos.length === 0) {
      toast.error("Selecione ao menos um aluno para promover.");
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="rounded-2xl gap-2 font-medium">
          <GraduationCap className="h-5 w-5 text-primary" />
          Promoção Seletiva
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Promoção Seletiva de Turmas
          </DialogTitle>
          <DialogDescription>
            Selecione individualmente quais alunos avançam para a próxima série e quais permanecem na turma atual.
          </DialogDescription>
        </DialogHeader>

        {/* Seleção de Turmas Origem e Destino */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">1. Turma de Origem</label>
            <Select value={origemId} onValueChange={setOrigemId}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecione a turma de origem" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} ({t.totalAlunos} alunos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase">2. Turma de Destino</label>
            <Select value={destinoId} onValueChange={setDestinoId}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecione a turma de destino" />
              </SelectTrigger>
              <SelectContent>
                {turmas
                  .filter((t) => t.id !== origemId)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Alunos com Checkboxes */}
        {origemId && (
          <div className="flex flex-col flex-1 min-h-0 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Selecione os Alunos para Promoção ({qtdPromovidos}/{totalOrigem})
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7 gap-1">
                  <CheckSquare className="h-3.5 w-3.5" /> Marcar Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7 gap-1">
                  <Square className="h-3.5 w-3.5" /> Desmarcar Todos
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[220px] border border-border rounded-xl p-2 space-y-1 bg-muted/20">
              {loadingAlunos ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Carregando alunos da turma...</div>
              ) : alunosOrigem.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Nenhum aluno nesta turma de origem.</div>
              ) : (
                alunosOrigem.map((aluno) => {
                  const isChecked = selectedAlunos.includes(aluno.id);
                  return (
                    <div
                      key={aluno.id}
                      onClick={() => toggleAluno(aluno.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-primary/10 border border-primary/20 text-foreground"
                          : "hover:bg-muted/50 border border-transparent text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleAluno(aluno.id)} />
                        <div>
                          <p className="text-sm font-medium leading-none">{aluno.nome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Matrícula: {aluno.matricula}</p>
                        </div>
                      </div>
                      <Badge variant={isChecked ? "default" : "outline"} className="text-[11px] h-5">
                        {isChecked ? "Avança" : "Permanece"}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>

            {/* Resumo da Operação */}
            {turmaDestinoObj && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-muted-foreground block">Total Origem</span>
                  <strong className="text-foreground text-sm font-bold">{totalOrigem}</strong>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 block font-medium">Promovidos</span>
                  <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-bold">{qtdPromovidos}</strong>
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-400 block font-medium">Permanecem</span>
                  <strong className="text-amber-700 dark:text-amber-300 text-sm font-bold">{qtdRetidos}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Destino</span>
                  <strong className="text-foreground text-sm font-bold truncate block">{turmaDestinoObj.nome}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={abrirConfirmacao}
            disabled={promocaoMutation.isPending || !origemId || !destinoId || selectedAlunos.length === 0}
            className="rounded-xl gap-2 font-medium"
          >
            {promocaoMutation.isPending ? "Processando..." : "Confirmar Promoção Seletiva"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Promoção de Turma?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a transferir <strong>{qtdPromovidos} aluno(s)</strong> de{" "}
              <strong>{turmaOrigemDetalhes?.nome}</strong> para <strong>{turmaDestinoObj?.nome}</strong>{" "}
              ({qtdRetidos} permanecerão na turma atual). Deseja realmente executar esta promoção?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar e Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmar} className="rounded-xl font-bold">
              Sim, confirmar promoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

