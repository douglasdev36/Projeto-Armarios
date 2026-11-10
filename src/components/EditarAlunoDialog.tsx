import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, AlunoItem } from "@/lib/api";
import { toast } from "sonner";
import { Pencil, Archive } from "lucide-react";

interface EditarAlunoDialogProps {
  aluno: AlunoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarAlunoDialog({ aluno, open, onOpenChange }: EditarAlunoDialogProps) {
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [turma, setTurma] = useState("");
  const [armario, setArmario] = useState<string>("none");

  const { data: armarios = [] } = useQuery({
    queryKey: ["armarios"],
    queryFn: api.getArmarios,
    enabled: open,
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
    enabled: open,
  });

  useEffect(() => {
    if (aluno) {
      setNome(aluno.nome || "");
      setMatricula(aluno.matricula || "");
      setTelefone(aluno.telefone === "—" ? "" : aluno.telefone || "");
      setEmail(aluno.email === "—" ? "" : aluno.email || "");
      setTurma(aluno.turma || "");
      setArmario(aluno.armario ? aluno.armario : "none");
    }
  }, [aluno]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AlunoItem>) => {
      if (!aluno) throw new Error("Nenhum aluno selecionado");
      return api.updateAluno(aluno.id, data);
    },
    onSuccess: () => {
      toast.success("Informações do aluno atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["armarios"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar aluno");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !matricula) {
      toast.error("Nome e Matrícula são obrigatórios");
      return;
    }

    updateMutation.mutate({
      nome,
      matricula,
      telefone: telefone || "—",
      email: email || "—",
      turma,
      armario: armario === "none" ? null : armario,
    });
  };

  // Filtrar armários que estão livres OU o armário que o aluno já possui atualmente
  const armariosDisponiveis = armarios.filter(
    (a) => a.status === "livre" || a.numero === aluno?.armario
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Aluno & Atribuir Armário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="edit-nome">Nome Completo*</Label>
            <Input
              id="edit-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do aluno"
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-matricula">Matrícula*</Label>
              <Input
                id="edit-matricula"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 2024001"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-turma">Turma</Label>
              <Select value={turma} onValueChange={setTurma}>
                <SelectTrigger id="edit-turma" className="mt-1">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.nome}>
                      {t.nome} ({t.anoLetivo})
                    </SelectItem>
                  ))}
                  {!turmas.some((t) => t.nome === turma) && turma && (
                    <SelectItem value={turma}>{turma}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aluno@email.com"
                className="mt-1"
              />
            </div>
          </div>

          {/* Seleção e Atribuição de Armário */}
          <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2">
            <Label htmlFor="edit-armario" className="flex items-center gap-1.5 font-semibold text-foreground">
              <Archive className="h-4 w-4 text-primary" />
              Atribuir / Alterar Armário
            </Label>
            <p className="text-xs text-muted-foreground">
              Apenas armários livres no sistema são listados para escolha.
            </p>
            <Select value={armario} onValueChange={setArmario}>
              <SelectTrigger id="edit-armario" className="mt-1 bg-background">
                <SelectValue placeholder="Selecione um armário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (Sem Armário)</SelectItem>
                {armariosDisponiveis.map((arm) => (
                  <SelectItem key={arm.id} value={arm.numero}>
                    Armário {arm.numero} {arm.numero === aluno?.armario ? "(Atual do Aluno)" : "(Disponível)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
