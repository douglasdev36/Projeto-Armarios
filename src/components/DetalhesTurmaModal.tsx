import { useState } from "react";
import { Eye, Search, UserMinus, Users, GraduationCap, Clock, BookOpen, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DetalhesTurmaModalProps {
  turmaId: string;
  turmaNome: string;
}

export function DetalhesTurmaModal({ turmaId, turmaNome }: DetalhesTurmaModalProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [alunoParaDesvincular, setAlunoParaDesvincular] = useState<{ id: string; nome: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: turma, isLoading } = useQuery({
    queryKey: ["turmaDetalhes", turmaId],
    queryFn: () => api.getTurmaDetalhes(turmaId),
    enabled: open,
  });

  const desvincularMutation = useMutation({
    mutationFn: (alunoId: string) => api.desvincularAlunoTurma(turmaId, alunoId),
    onSuccess: (data) => {
      toast.success(data.message || "Aluno desvinculado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["turmaDetalhes", turmaId] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      setAlunoParaDesvincular(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desvincular aluno");
    },
  });

  const filteredAlunos = (turma?.alunos || []).filter((a) =>
    a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.matricula.includes(searchTerm)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
            title="Visualizar alunos e detalhes da turma"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {turma?.nome || turmaNome}
                </DialogTitle>
                <DialogDescription>
                  Relação completa de alunos matriculados e informações acadêmicas.
                </DialogDescription>
              </div>
              <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold">
                {turma?.qtdAlunos ?? 0} {turma?.qtdAlunos === 1 ? "Aluno" : "Alunos"}
              </Badge>
            </div>
          </DialogHeader>

          {/* Cards de Metadados da Turma */}
          <div className="grid grid-cols-3 gap-3 my-2">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
              <span className="text-muted-foreground flex items-center gap-1 mb-1">
                <BookOpen className="h-3.5 w-3.5" /> Curso
              </span>
              <p className="font-semibold text-foreground truncate">{turma?.curso || "Ensino Regular"}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
              <span className="text-muted-foreground flex items-center gap-1 mb-1">
                <GraduationCap className="h-3.5 w-3.5" /> Série / Período
              </span>
              <p className="font-semibold text-foreground truncate">{turma?.serie || "Geral"}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
              <span className="text-muted-foreground flex items-center gap-1 mb-1">
                <Clock className="h-3.5 w-3.5" /> Turno
              </span>
              <p className="font-semibold text-foreground truncate">{turma?.turno || "Manhã"}</p>
            </div>
          </div>

          {/* Campo de Busca de Alunos */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar aluno por nome ou matrícula..."
              className="pl-9 h-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Lista com Rolagem Interna */}
          <div className="flex-1 overflow-y-auto max-h-[360px] border border-border rounded-xl divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando alunos da turma...</div>
            ) : filteredAlunos.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {searchTerm ? "Nenhum aluno corresponde à pesquisa." : "Nenhum aluno vinculado a esta turma."}
              </div>
            ) : (
              filteredAlunos.map((aluno) => (
                <div
                  key={aluno.id}
                  className="p-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm text-foreground">{aluno.nome}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Matrícula: {aluno.matricula}</span>
                      {aluno.armario && (
                        <Badge variant="outline" className="text-[11px] h-5 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                          Armário: {aluno.armario}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs gap-1 h-8 rounded-lg"
                    onClick={() => setAlunoParaDesvincular({ id: aluno.id, nome: aluno.nome })}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Desvincular
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de desvinculação */}
      <AlertDialog open={!!alunoParaDesvincular} onOpenChange={(val) => !val && setAlunoParaDesvincular(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Desvincular Aluno da Turma
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja remover <strong>{alunoParaDesvincular?.nome}</strong> da turma{" "}
              <strong>{turmaNome}</strong>?
              <br />
              <br />
              <span className="text-xs text-muted-foreground">
                * O cadastro do aluno, armário atribuído e históricos serão devidamente preservados no sistema.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
              onClick={() => {
                if (alunoParaDesvincular) {
                  desvincularMutation.mutate(alunoParaDesvincular.id);
                }
              }}
            >
              Sim, desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

