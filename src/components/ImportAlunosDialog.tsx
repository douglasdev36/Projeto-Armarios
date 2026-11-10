import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportedAluno {
  nome: string;
  matricula: string;
  email?: string;
  telefone?: string;
  turmaNome?: string;
}

function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function ImportAlunosDialog() {
  const [open, setOpen] = useState(false);
  const [importedData, setImportedData] = useState<ImportedAluno[]>([]);
  const [linhasIgnoradas, setLinhasIgnoradas] = useState(0);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>("");
  const [atualizarExistentes, setAtualizarExistentes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: api.getTurmas,
    enabled: open,
  });

  const importarMutation = useMutation({
    mutationFn: api.importarAlunosLote,
    onSuccess: (res) => {
      toast.success(res.message || "Alunos importados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      queryClient.invalidateQueries({ queryKey: ["turma-detalhes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      handleClear();
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao importar alunos");
    },
  });

  const processFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Formato inválido. Selecione ou arraste um arquivo .xlsx, .xls ou .csv.");
      return;
    }

    setIsProcessing(true);
    setNomeArquivo(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

        // Remove linhas totalmente vazias
        const nonEmptyRows = rows.filter((row) =>
          row.some((cell) => String(cell ?? "").trim() !== "")
        );

        if (nonEmptyRows.length === 0) {
          toast.error("A planilha está vazia.");
          setIsProcessing(false);
          return;
        }

        const firstRow = nonEmptyRows[0].map((c) => normalizeHeader(String(c ?? "")));
        const hasHeader = firstRow.some((h) =>
          ["nome", "aluno", "estudante", "matricula", "ra", "registro", "email", "e-mail", "telefone", "celular", "turma"].some((kw) =>
            h.includes(kw)
          )
        );

        let idxNome = 0;
        let idxMatricula = 1;
        let idxEmail = 2;
        let idxTelefone = 3;
        let idxTurma = 4;
        let startIndex = 0;

        if (hasHeader) {
          startIndex = 1;
          const foundNome = firstRow.findIndex((h) => h === "nome" || h.includes("nome") || h.includes("aluno"));
          const foundMat = firstRow.findIndex((h) => h.includes("matric") || h === "ra" || h.includes("registro"));
          const foundEmail = firstRow.findIndex((h) => h.includes("mail"));
          const foundTel = firstRow.findIndex((h) => h.includes("tel") || h.includes("cel") || h.includes("fone") || h.includes("contato") || h.includes("whats"));
          const foundTurma = firstRow.findIndex((h) => h.includes("turma") || h.includes("classe") || h.includes("sala"));

          idxNome = foundNome >= 0 ? foundNome : 0;
          idxMatricula = foundMat >= 0 ? foundMat : 1;
          idxEmail = foundEmail;
          idxTelefone = foundTel;
          idxTurma = foundTurma;
        }

        let ignoradas = 0;
        const processed: ImportedAluno[] = [];

        for (let i = startIndex; i < nonEmptyRows.length; i++) {
          const row = nonEmptyRows[i];
          const nome = String(row[idxNome] ?? "").trim();
          const matricula = String(row[idxMatricula] ?? "").trim();

          if (!nome || !matricula) {
            ignoradas++;
            continue;
          }

          processed.push({
            nome,
            matricula,
            email: idxEmail >= 0 ? String(row[idxEmail] ?? "").trim() : "",
            telefone: idxTelefone >= 0 ? String(row[idxTelefone] ?? "").trim() : "",
            turmaNome: idxTurma >= 0 ? String(row[idxTurma] ?? "").trim() : "",
          });
        }

        setImportedData(processed);
        setLinhasIgnoradas(ignoradas);

        if (processed.length === 0) {
          toast.error("Nenhum aluno válido encontrado. Verifique se as colunas Nome e Matrícula estão preenchidas.");
        } else {
          toast.success(`${processed.length} aluno(s) carregado(s) da planilha!`);
        }
      } catch {
        toast.error("Erro ao ler a planilha. Verifique se é um arquivo Excel (.xlsx) válido.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleBaixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "Matricula", "Email", "Telefone"],
      ["Ana Clara Silva", "2026001", "ana.clara@escola.com", "(11) 99999-1111"],
      ["Lucas Oliveira", "2026002", "", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alunos");
    XLSX.writeFile(wb, "modelo_importacao_alunos.xlsx");
  };

  const handleClear = () => {
    setImportedData([]);
    setLinhasIgnoradas(0);
    setNomeArquivo("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = () => {
    if (!turmaSelecionadaId) {
      toast.error("Escolha a turma de destino antes de confirmar a importação.");
      return;
    }

    importarMutation.mutate({
      turmaId: turmaSelecionadaId,
      atualizarExistentes,
      alunos: importedData,
    });
  };

  const turmaSelecionadaObj = turmas.find((t) => t.id === turmaSelecionadaId);
  const nomeTurmaDestino =
    turmaSelecionadaId === "planilha"
      ? "Conforme planilha"
      : turmaSelecionadaId === "sem_turma"
      ? "Sem turma"
      : turmaSelecionadaObj?.nome || "—";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="rounded-2xl gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Alunos em Lote (.xlsx)
          </DialogTitle>
          <DialogDescription>
            Escolha a turma de destino e arraste sua planilha Excel. Apenas <strong>Nome</strong> e <strong>Matrícula</strong> são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
          {/* Seleção da Turma de Destino */}
          <div className="p-4 rounded-2xl border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Turma de Destino *
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBaixarModelo}
                className="h-8 text-xs gap-1.5 text-primary hover:text-primary"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar modelo .xlsx
              </Button>
            </div>

            <Select value={turmaSelecionadaId} onValueChange={setTurmaSelecionadaId}>
              <SelectTrigger className="rounded-xl h-11 bg-background">
                <SelectValue placeholder="Selecione para qual turma os alunos vão..." />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} ({t.anoLetivo} • {t.turno || "Manhã"})
                  </SelectItem>
                ))}
                <SelectItem value="planilha">Usar coluna "Turma" da própria planilha</SelectItem>
                <SelectItem value="sem_turma">Importar sem vincular turma</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Instruções das Colunas */}
          <div className="bg-muted/40 rounded-2xl p-4 space-y-2 border">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Colunas da Planilha Excel (.xlsx):
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-background rounded-xl p-2.5 text-center border border-primary/30">
                <span className="font-bold text-foreground">Nome *</span>
                <br />
                <span className="text-primary text-[11px] font-medium">Obrigatório</span>
              </div>
              <div className="bg-background rounded-xl p-2.5 text-center border border-primary/30">
                <span className="font-bold text-foreground">Matrícula *</span>
                <br />
                <span className="text-primary text-[11px] font-medium">Obrigatório</span>
              </div>
              <div className="bg-background rounded-xl p-2.5 text-center border">
                <span className="font-medium text-foreground">E-mail</span>
                <br />
                <span className="text-muted-foreground text-[11px]">Opcional</span>
              </div>
              <div className="bg-background rounded-xl p-2.5 text-center border">
                <span className="font-medium text-foreground">Telefone</span>
                <br />
                <span className="text-muted-foreground text-[11px]">Opcional</span>
              </div>
            </div>
          </div>

          {/* Área de Drag & Drop / Upload */}
          {importedData.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <Upload
                className={`h-12 w-12 mx-auto mb-3 transition-colors ${
                  isDragging ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <p className="font-semibold text-foreground mb-1">
                {isDragging ? "Solte a planilha aqui!" : "Arraste e solte seu arquivo .xlsx aqui"}
              </p>
              <p className="text-sm text-muted-foreground">ou clique para procurar no computador</p>
              <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: .xlsx, .xls, .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="font-medium">
                    <strong>{importedData.length}</strong> aluno(s) lido(s) de{" "}
                    <span className="text-muted-foreground">{nomeArquivo}</span>
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear} className="rounded-xl">
                  <X className="h-4 w-4 mr-1" />
                  Trocar arquivo
                </Button>
              </div>

              {linhasIgnoradas > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {linhasIgnoradas} linha(s) da planilha foram ignoradas por estarem sem Nome ou sem Matrícula.
                  </span>
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Matrícula</th>
                      <th className="text-left p-3 font-medium">Turma Destino</th>
                      <th className="text-left p-3 font-medium">E-mail</th>
                      <th className="text-left p-3 font-medium">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.slice(0, 15).map((aluno, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3 font-medium">{aluno.nome}</td>
                        <td className="p-3 text-muted-foreground">{aluno.matricula}</td>
                        <td className="p-3">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-xs font-medium">
                            {turmaSelecionadaId === "planilha"
                              ? aluno.turmaNome || "Sem turma"
                              : nomeTurmaDestino}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{aluno.email || "—"}</td>
                        <td className="p-3 text-muted-foreground text-xs">{aluno.telefone || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedData.length > 15 && (
                  <div className="p-2.5 text-center text-xs text-muted-foreground border-t bg-muted/30">
                    ... e mais {importedData.length - 15} aluno(s)
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="atualizar-existentes"
                  checked={atualizarExistentes}
                  onCheckedChange={(checked) => setAtualizarExistentes(Boolean(checked))}
                />
                <Label htmlFor="atualizar-existentes" className="text-xs text-muted-foreground cursor-pointer">
                  Se a matrícula já existir no sistema, mover/atualizar o aluno para a turma selecionada
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={importedData.length === 0 || !turmaSelecionadaId || isProcessing || importarMutation.isPending}
            className="rounded-xl font-medium"
          >
            {importarMutation.isPending
              ? "Importando..."
              : `Importar ${importedData.length > 0 ? `${importedData.length} alunos` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
