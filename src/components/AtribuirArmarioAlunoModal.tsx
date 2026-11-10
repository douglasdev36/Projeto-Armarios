import { useState, useEffect } from "react";
import { Archive, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, AlunoItem } from "@/lib/api";
import { toast } from "sonner";

interface AtribuirArmarioAlunoModalProps {
  aluno: AlunoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AtribuirArmarioAlunoModal({
  aluno,
  open,
  onOpenChange,
}: AtribuirArmarioAlunoModalProps) {
  const [selectedPrefixo, setSelectedPrefixo] = useState<string>("todos");
  const [selectedArmarioId, setSelectedArmarioId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSelectedPrefixo("todos");
      setSelectedArmarioId(null);
    }
  }, [open, aluno?.id]);

  const { data: armarios = [], isLoading } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
    enabled: open && !!aluno,
  });

  const atribuirMutation = useMutation({
    mutationFn: () => api.distribuirArmario(selectedArmarioId!, aluno!.id),
    onSuccess: (data) => {
      toast.success(data.message || "Armário atribuído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atribuir armário");
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
    },
  });

  const getBloco = (numero: string, bloco?: string) =>
    (bloco || numero.split("-")[0] || "").toUpperCase();

  // Lista todos os prefixos existentes no sistema para consulta
  const prefixosExistentes = Array.from(
    new Set(armarios.map((a) => getBloco(a.numero, a.bloco)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  // Apenas armários realmente livres e sem aluno vinculado
  const armariosLivres = armarios
    .filter((a) => a.status === "livre" && !a.alunoId && !a.aluno)
    .sort((a, b) => {
      const bA = getBloco(a.numero, a.bloco);
      const bB = getBloco(b.numero, b.bloco);
      if (bA !== bB) return bA.localeCompare(bB, undefined, { numeric: true, sensitivity: "base" });
      return a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: "base" });
    });

  const livresPorPrefixo = (prefixo: string) =>
    armariosLivres.filter((a) => getBloco(a.numero, a.bloco) === prefixo).length;

  const armariosFiltrados =
    selectedPrefixo === "todos"
      ? armariosLivres
      : armariosLivres.filter((a) => getBloco(a.numero, a.bloco) === selectedPrefixo);

  const selectedArmarioObj = armariosLivres.find((a) => a.id === selectedArmarioId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Archive className="h-5 w-5 text-emerald-600" />
            Atribuir Armário ao Aluno
          </DialogTitle>
          <DialogDescription>
            Escolha o prefixo/bloco para verificar os armários livres e atribuir ao estudante selecionado.
          </DialogDescription>
        </DialogHeader>

        {aluno && (
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-foreground">{aluno.nome}</p>
              <p className="text-xs text-muted-foreground">
                Matrícula: {aluno.matricula} • Turma: {aluno.turma || "Sem Turma"}
              </p>
            </div>
            {aluno.armario && (
              <Badge variant="destructive" className="text-xs shrink-0">
                Já possui {aluno.armario}
              </Badge>
            )}
          </div>
        )}

        {aluno?.armario ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-sm text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>
              Este aluno já possui o armário <strong>{aluno.armario}</strong> ativo. Libere ou faça a troca na tela de Armários antes de atribuir outro.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filtro por Prefixo / Bloco */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                1. Escolha o Prefixo / Bloco
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedPrefixo === "todos" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedPrefixo("todos");
                    setSelectedArmarioId(null);
                  }}
                  className="rounded-xl h-8 text-xs"
                >
                  Todos ({armariosLivres.length} livres)
                </Button>
                {prefixosExistentes.map((pref) => {
                  const qtdLivres = livresPorPrefixo(pref);
                  return (
                    <Button
                      key={pref}
                      type="button"
                      size="sm"
                      variant={selectedPrefixo === pref ? "default" : "outline"}
                      onClick={() => {
                        setSelectedPrefixo(pref);
                        setSelectedArmarioId(null);
                      }}
                      className={`rounded-xl h-8 text-xs ${
                        qtdLivres === 0 && selectedPrefixo !== pref ? "opacity-60" : ""
                      }`}
                    >
                      Bloco {pref} ({qtdLivres})
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Grade de Armários Disponíveis */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                2. Selecione um Armário Livre
              </p>

              <div className="max-h-[230px] overflow-y-auto border border-border rounded-2xl p-3">
                {isLoading ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    Verificando armários disponíveis...
                  </p>
                ) : armariosFiltrados.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">
                      {selectedPrefixo === "todos"
                        ? "Não há nenhum armário livre no momento."
                        : `Não há armários disponíveis no Bloco ${selectedPrefixo}.`}
                    </p>
                    <p>Selecione outro prefixo acima ou libere armários ocupados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {armariosFiltrados.map((arm) => {
                      const isSelected = selectedArmarioId === arm.id;
                      return (
                        <button
                          key={arm.id}
                          type="button"
                          onClick={() => setSelectedArmarioId(arm.id)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                          {arm.numero}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {selectedArmarioObj && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex justify-between items-center">
                <span className="text-emerald-800 dark:text-emerald-300">Armário selecionado:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-200">
                  {selectedArmarioObj.numero}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          {!aluno?.armario && (
            <Button
              onClick={() => atribuirMutation.mutate()}
              disabled={!selectedArmarioId || atribuirMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
            >
              {atribuirMutation.isPending ? "Atribuindo..." : "Confirmar Atribuição"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
