import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CadastrarAluno() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
  });

  const createMutation = useMutation({
    mutationFn: api.createAluno,
    onSuccess: () => {
      toast.success("Aluno cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      navigate("/alunos");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cadastrar aluno");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !matricula) {
      toast.error("Nome e Matrícula são obrigatórios");
      return;
    }

    createMutation.mutate({
      nome,
      matricula,
      telefone,
      email,
      turmaId: turmaId || undefined,
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Início</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/alunos">Alunos</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Cadastrar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-3xl font-bold text-foreground mb-8">Cadastro de Aluno</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Student Data */}
            <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
              <h2 className="text-lg font-semibold text-foreground mb-2">Dados do Aluno</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Preencha as informações para gravar um novo aluno no banco de dados.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome Completo*</Label>
                  <Input
                    id="nome"
                    placeholder="Digite o nome completo do aluno"
                    className="mt-1.5"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="matricula">Matrícula*</Label>
                    <Input
                      id="matricula"
                      placeholder="Ex: 2024007"
                      className="mt-1.5"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="turma">Turma</Label>
                    <Select value={turmaId} onValueChange={setTurmaId}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmas.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nome} ({t.anoLetivo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      className="mt-1.5"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      className="mt-1.5"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => navigate("/alunos")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar no Banco"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
