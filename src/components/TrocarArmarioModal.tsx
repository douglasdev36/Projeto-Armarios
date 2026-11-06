import { useState } from "react";
import { ArrowLeftRight, Search, Check } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, ArmarioItem } from "@/lib/api";
import { toast } from "sonner";

interface TrocarArmarioModalProps {
  armarioAtual: ArmarioItem;
}

export function TrocarArmarioModal({ armarioAtual }: TrocarArmarioModalProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [novoArmarioId, setNovoArmarioId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: todosArmarios = [], isLoading } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
    enabled: open,
  });

  const trocarMutation = useMutation({
    mutationFn: () => api.trocarArmario(armarioAtual.alunoId!, novoArmarioId!),
    onSuccess: (data) => {
      toast.success(data.message || "Troca de armário realizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setOpen(false);
      setNovoArmarioId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao realizar troca");
    },
  });

  const armariosLivres = todosArmarios.filter(
    (a) => a.status === "livre" && a.id !== armarioAtual.id
  );

  const filteredLivres = armariosLivres.filter((a) =>
    a.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.bloco && a.bloco.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const novoArmarioObj = todosArmarios.find((a) => a.id === novoArmarioId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
          title="Transferir aluno para outro armário"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Trocar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            Troca de Armário
          </DialogTitle>
          <DialogDescription>
            Transferir <strong>{armarioAtual.aluno}</strong> do armário atual{" "}
            <Badge variant="outline" className="font-bold">{armarioAtual.numero}</Badge> para outro armário livre.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar novo armário disponível..."
            className="pl-9 h-10 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="max-h-[220px] overflow-y-auto border border-border rounded-xl p-2 space-y-1">
          {isLoading ? (
            <p className="p-4 text-center text-xs text-muted-foreground">Carregando armários livres...</p>
          ) : filteredLivres.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">Nenhum outro armário livre disponível.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredLivres.map((armario) => {
                const isSelected = novoArmarioId === armario.id;
                return (
                  <button
                    key={armario.id}
                    type="button"
                    onClick={() => setNovoArmarioId(armario.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-muted/30 border-border hover:border-primary text-foreground"
                    }`}
                  >
                    <span className="font-bold text-sm">{armario.numero}</span>
                    <span className="text-[10px] opacity-75">Bloco {armario.bloco || "—"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {novoArmarioObj && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs space-y-1">
            <p className="text-foreground">
              <strong>Resumo da movimentação:</strong>
            </p>
            <p className="text-muted-foreground">
              Armário <span className="line-through">{armarioAtual.numero}</span> (será liberado) ➔{" "}
              <strong className="text-blue-600 dark:text-blue-400 font-bold">{novoArmarioObj.numero}</strong> (novo armário do aluno)
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={() => trocarMutation.mutate()}
            disabled={!novoArmarioId || trocarMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            {trocarMutation.isPending ? "Efetuando..." : "Confirmar Troca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

