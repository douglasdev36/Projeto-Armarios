import { useState } from "react";
import { ArrowRight, Trash2, UserMinus, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Aluno {
  id: number;
  nome: string;
  matricula: string;
}

interface Turma {
  id: number;
  nome: string;
  serie: string;
  turno: string;
  qtdAlunos: number;
  sala: string;
  alunos: Aluno[];
}

// Dados mock de turmas com alunos
const turmasIniciais: Turma[] = [
  { 
    id: 1, 
    nome: "1º Ano A", 
    serie: "1º Ano", 
    turno: "Manhã", 
    qtdAlunos: 5, 
    sala: "101",
    alunos: [
      { id: 1, nome: "Ana Silva", matricula: "2024001" },
      { id: 2, nome: "Bruno Costa", matricula: "2024002" },
      { id: 3, nome: "Carlos Santos", matricula: "2024003" },
      { id: 4, nome: "Diana Oliveira", matricula: "2024004" },
      { id: 5, nome: "Eduardo Lima", matricula: "2024005" },
    ]
  },
  { 
    id: 2, 
    nome: "1º Ano B", 
    serie: "1º Ano", 
    turno: "Manhã", 
    qtdAlunos: 4, 
    sala: "102",
    alunos: [
      { id: 6, nome: "Fernanda Reis", matricula: "2024006" },
      { id: 7, nome: "Gabriel Souza", matricula: "2024007" },
      { id: 8, nome: "Helena Martins", matricula: "2024008" },
      { id: 9, nome: "Igor Pereira", matricula: "2024009" },
    ]
  },
  { 
    id: 3, 
    nome: "2º Ano A", 
    serie: "2º Ano", 
    turno: "Manhã", 
    qtdAlunos: 4, 
    sala: "201",
    alunos: [
      { id: 10, nome: "Julia Fernandes", matricula: "2023001" },
      { id: 11, nome: "Lucas Almeida", matricula: "2023002" },
      { id: 12, nome: "Mariana Castro", matricula: "2023003" },
      { id: 13, nome: "Nicolas Rocha", matricula: "2023004" },
    ]
  },
  { 
    id: 4, 
    nome: "2º Ano B", 
    serie: "2º Ano", 
    turno: "Tarde", 
    qtdAlunos: 4, 
    sala: "202",
    alunos: [
      { id: 14, nome: "Olivia Dias", matricula: "2023005" },
      { id: 15, nome: "Pedro Cardoso", matricula: "2023006" },
      { id: 16, nome: "Rafaela Gomes", matricula: "2023007" },
      { id: 17, nome: "Samuel Ribeiro", matricula: "2023008" },
    ]
  },
  { 
    id: 5, 
    nome: "3º Ano A", 
    serie: "3º Ano", 
    turno: "Manhã", 
    qtdAlunos: 3, 
    sala: "301",
    alunos: [
      { id: 18, nome: "Tatiana Nunes", matricula: "2022001" },
      { id: 19, nome: "Vinícius Moura", matricula: "2022002" },
      { id: 20, nome: "Wesley Cunha", matricula: "2022003" },
    ]
  },
  { 
    id: 6, 
    nome: "3º Ano B", 
    serie: "3º Ano", 
    turno: "Tarde", 
    qtdAlunos: 3, 
    sala: "302",
    alunos: [
      { id: 21, nome: "Yasmin Freitas", matricula: "2022004" },
      { id: 22, nome: "Zeca Barbosa", matricula: "2022005" },
      { id: 23, nome: "Amanda Vieira", matricula: "2022006" },
    ]
  },
];

const series = ["1º Ano", "2º Ano", "3º Ano"];

interface GerenciarTurmasDialogProps {
  children: React.ReactNode;
}

export function GerenciarTurmasDialog({ children }: GerenciarTurmasDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [turmas, setTurmas] = useState<Turma[]>(turmasIniciais);
  const [expandedTurma, setExpandedTurma] = useState<number | null>(null);
  const [selectedAlunos, setSelectedAlunos] = useState<number[]>([]);
  const [turmaParaPromover, setTurmaParaPromover] = useState<Turma | null>(null);
  const [novaSeriePromocao, setNovaSeriePromocao] = useState<string>("");
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<Turma | null>(null);

  const handleToggleExpand = (turmaId: number) => {
    if (expandedTurma === turmaId) {
      setExpandedTurma(null);
      setSelectedAlunos([]);
    } else {
      setExpandedTurma(turmaId);
      setSelectedAlunos([]);
    }
  };

  const handleToggleAluno = (alunoId: number) => {
    setSelectedAlunos(prev => 
      prev.includes(alunoId) 
        ? prev.filter(id => id !== alunoId)
        : [...prev, alunoId]
    );
  };

  const handleRemoverAlunosSelecionados = () => {
    if (expandedTurma === null || selectedAlunos.length === 0) return;

    setTurmas(prev => prev.map(turma => {
      if (turma.id === expandedTurma) {
        const alunosRestantes = turma.alunos.filter(a => !selectedAlunos.includes(a.id));
        return {
          ...turma,
          alunos: alunosRestantes,
          qtdAlunos: alunosRestantes.length
        };
      }
      return turma;
    }));

    toast.success(`${selectedAlunos.length} aluno(s) removido(s) da turma`);
    setSelectedAlunos([]);
  };

  const handlePromoverTurma = () => {
    if (!turmaParaPromover || !novaSeriePromocao) return;

    // Atualiza o nome da turma baseado na nova série
    const letraTurma = turmaParaPromover.nome.split(" ").pop(); // "A", "B", etc.
    const novoNome = `${novaSeriePromocao} ${letraTurma}`;

    setTurmas(prev => prev.map(turma => {
      if (turma.id === turmaParaPromover.id) {
        return {
          ...turma,
          nome: novoNome,
          serie: novaSeriePromocao
        };
      }
      return turma;
    }));

    toast.success(`Turma ${turmaParaPromover.nome} promovida para ${novoNome}`);
    setTurmaParaPromover(null);
    setNovaSeriePromocao("");
  };

  const handleExcluirTurma = () => {
    if (!turmaParaExcluir) return;

    setTurmas(prev => prev.filter(t => t.id !== turmaParaExcluir.id));
    toast.success(`Turma ${turmaParaExcluir.nome} excluída com sucesso`);
    setTurmaParaExcluir(null);
    setExpandedTurma(null);
  };

  const getProximaSerie = (serieAtual: string): string | null => {
    const index = series.indexOf(serieAtual);
    if (index < series.length - 1) {
      return series[index + 1];
    }
    return null;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Gerenciar Turmas</DialogTitle>
            <DialogDescription>
              Promova turmas para a próxima série, exclua turmas formadas ou remova alunos específicos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {turmas.map((turma) => (
              <div key={turma.id} className="border border-border rounded-2xl overflow-hidden">
                {/* Cabeçalho da turma */}
                <div 
                  className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleToggleExpand(turma.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{turma.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {turma.qtdAlunos} alunos • {turma.turno} • Sala {turma.sala}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botão Promover */}
                    {getProximaSerie(turma.serie) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTurmaParaPromover(turma);
                          setNovaSeriePromocao(getProximaSerie(turma.serie) || "");
                        }}
                      >
                        <ArrowRight className="h-4 w-4" />
                        Promover
                      </Button>
                    )}
                    {/* Botão Excluir Turma */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTurmaParaExcluir(turma);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {expandedTurma === turma.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Lista de alunos expandida */}
                {expandedTurma === turma.id && (
                  <div className="border-t border-border">
                    {selectedAlunos.length > 0 && (
                      <div className="p-3 bg-destructive/5 border-b border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {selectedAlunos.length} aluno(s) selecionado(s)
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-xl gap-1"
                          onClick={handleRemoverAlunosSelecionados}
                        >
                          <UserMinus className="h-4 w-4" />
                          Remover Selecionados
                        </Button>
                      </div>
                    )}
                    <div className="p-3 space-y-1 max-h-60 overflow-y-auto">
                      {turma.alunos.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum aluno nesta turma
                        </p>
                      ) : (
                        turma.alunos.map((aluno) => (
                          <label
                            key={aluno.id}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedAlunos.includes(aluno.id)}
                              onCheckedChange={() => handleToggleAluno(aluno.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{aluno.nome}</p>
                              <p className="text-xs text-muted-foreground">Matrícula: {aluno.matricula}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Promoção */}
      <AlertDialog open={!!turmaParaPromover} onOpenChange={(open) => !open && setTurmaParaPromover(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Promover Turma</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a promover a turma <strong>{turmaParaPromover?.nome}</strong> para a próxima série.
              Isso irá atualizar a série de todos os {turmaParaPromover?.qtdAlunos} alunos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Nova Série</label>
            <Select value={novaSeriePromocao} onValueChange={setNovaSeriePromocao}>
              <SelectTrigger className="rounded-xl h-12 mt-2">
                <SelectValue placeholder="Selecione a nova série" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {series.map((serie) => (
                  <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl"
              onClick={handlePromoverTurma}
              disabled={!novaSeriePromocao}
            >
              Promover Turma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={!!turmaParaExcluir} onOpenChange={(open) => !open && setTurmaParaExcluir(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Turma</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a turma <strong>{turmaParaExcluir?.nome}</strong>?
              Esta ação irá remover a turma e desassociar {turmaParaExcluir?.qtdAlunos} alunos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl bg-destructive hover:bg-destructive/90"
              onClick={handleExcluirTurma}
            >
              Excluir Turma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
