import { useState } from "react";
import { Trash2, AlertTriangle, Calculator, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

const prefixos = ["A", "B", "C", "D", "E", "F"];

export function ExcluirArmariosLoteDialog() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [prefixo, setPrefixo] = useState("A");
  const [inicio, setInicio] = useState("1");
  const [fim, setFim] = useState("10");
  const [previewData, setPreviewData] = useState<any>(null);
  const [apenasLivres, setApenasLivres] = useState(true);
  const queryClient = useQueryClient();

  const previewMutation = useMutation({
    mutationFn: () =>
      api.previewExcluirArmariosLote(prefixo, parseInt(inicio, 10), parseInt(fim, 10)),
    onSuccess: (data) => {
      setPreviewData(data);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao calcular prévia");
    },
  });

  const excluirMutation = useMutation({
    mutationFn: () =>
      api.excluirArmariosLote(prefixo, parseInt(inicio, 10), parseInt(fim, 10), apenasLivres),
    onSuccess: (data) => {
      toast.success(data.message || "Armários excluídos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setConfirmOpen(false);
      setOpen(false);
      setPreviewData(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir armários");
    },
  });

  const handleCalcularPrevia = () => {
    const start = parseInt(inicio, 10);
    const end = parseInt(fim, 10);
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      toast.error("Informe um intervalo válido (ex: 1 até 20).");
      return;
    }
    previewMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="rounded-2xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Excluir por Intervalo
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Exclusão de Armários por Intervalo
            </DialogTitle>
            <DialogDescription>
              Defina um prefixo e o intervalo numérico para exclusão de armários em lote.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Prefixo</Label>
              <Select value={prefixo} onValueChange={(val) => { setPrefixo(val); setPreviewData(null); }}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prefixos.map((p) => (
                    <SelectItem key={p} value={p}>Bloco {p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Nº Início</Label>
              <Input
                type="number"
                min="1"
                className="h-11 rounded-xl"
                value={inicio}
                onChange={(e) => { setInicio(e.target.value); setPreviewData(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Nº Fim</Label>
              <Input
                type="number"
                min="1"
                className="h-11 rounded-xl"
                value={fim}
                onChange={(e) => { setFim(e.target.value); setPreviewData(null); }}
              />
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleCalcularPrevia}
            disabled={previewMutation.isPending}
            className="w-full rounded-xl gap-2 h-10 font-medium"
          >
            <Calculator className="h-4 w-4" />
            {previewMutation.isPending ? "Calculando..." : "Calcular Prévia dos Armários"}
          </Button>

          {/* Resultado da Prévia */}
          {previewData && (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">Resumo da Seleção ({prefixo}-{inicio} a {prefixo}-{fim})</span>
                <Badge variant="outline">{previewData.totalEncontrados} cadastrados</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                  <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Armários Livres</span>
                  <strong className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{previewData.livres}</strong>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl">
                  <span className="text-rose-700 dark:text-rose-400 block font-medium">Armários Ocupados</span>
                  <strong className="text-lg font-bold text-rose-800 dark:text-rose-300">{previewData.ocupados}</strong>
                </div>
              </div>

              {previewData.ocupados > 0 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Atenção: existem <strong>{previewData.ocupados}</strong> armários ocupados. O sistema irá excluir apenas os armários livres para não comprometer alunos.
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!previewData || previewData.totalEncontrados === 0 || (previewData.livres === 0)}
              onClick={() => setConfirmOpen(true)}
              className="rounded-xl font-medium"
            >
              Prosseguir com a Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação Explícita de Exclusão */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão em Lote
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente <strong>{previewData?.livres}</strong> armários livres do Bloco {prefixo} (intervalo {inicio} a {fim}).
              <br /><br />
              Esta ação não pode ser desfeita. Deseja realmente prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluirMutation.mutate()}
              disabled={excluirMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
            >
              {excluirMutation.isPending ? "Excluindo..." : "Sim, excluir armários"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

