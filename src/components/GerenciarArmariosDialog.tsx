import { useState } from "react";
import { Plus, Trash2, Archive } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const prefixosDisponiveis = ["A", "B", "C", "D", "E"];

export function GerenciarArmariosDialog() {
  const [open, setOpen] = useState(false);
  const [novoPrefixo, setNovoPrefixo] = useState("D");
  const [novoInicio, setNovoInicio] = useState("1");
  const [novoFim, setNovoFim] = useState("20");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddRange = async () => {
    const inicio = parseInt(novoInicio, 10);
    const fim = parseInt(novoFim, 10);

    if (isNaN(inicio) || isNaN(fim) || inicio < 1 || fim < inicio) {
      toast({
        title: "Valores inválidos",
        description: "Verifique os números de início e fim.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await api.gerarArmariosLote(novoPrefixo, inicio, fim);
      
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });

      toast({
        title: "Bloco criado no PostgreSQL!",
        description: res.message || `Armários ${novoPrefixo}-${inicio} até ${novoPrefixo}-${fim} cadastrados.`,
      });

      setNovoInicio("1");
      setNovoFim("20");
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Erro ao criar bloco",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-2xl gap-2">
          <Archive className="h-4 w-4" />
          Gerenciar Armários
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Gerenciar Blocos de Armários</DialogTitle>
          <DialogDescription>
            Gere blocos de armários em lote diretamente no banco PostgreSQL (ex: Bloco D, de 1 a 20).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="border pt-4 p-4 rounded-xl space-y-4">
            <Label className="text-sm font-medium">Gerar Novo Bloco em Lote</Label>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Prefixo</Label>
                <Select value={novoPrefixo} onValueChange={setNovoPrefixo}>
                  <SelectTrigger className="mt-1 rounded-xl">
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
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="number"
                  min="1"
                  value={novoInicio}
                  onChange={(e) => setNovoInicio(e.target.value)}
                  className="mt-1 rounded-xl"
                  placeholder="1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="number"
                  min="1"
                  value={novoFim}
                  onChange={(e) => setNovoFim(e.target.value)}
                  className="mt-1 rounded-xl"
                  placeholder="20"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddRange} disabled={loading} className="w-full rounded-xl">
                  {loading ? "Gerando..." : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Serão gravados no banco os armários {novoPrefixo}-{novoInicio || "?"} até {novoPrefixo}-{novoFim || "?"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
