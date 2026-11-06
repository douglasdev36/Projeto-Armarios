import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ImportedAluno {
  nome: string;
  matricula: string;
  turma: string;
  email: string;
  armario?: string;
}

// Lista de armários disponíveis (simulado)
const armariosDisponiveis = [
  "A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-8", "A-9", "A-10",
  "B-1", "B-2", "B-3", "B-4", "B-5",
  "C-1", "C-2", "C-3",
];

export function ImportAlunosDialog() {
  const [open, setOpen] = useState(false);
  const [importedData, setImportedData] = useState<ImportedAluno[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const binaryStr = evt.target?.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        // Pular a primeira linha se for cabeçalho
        const dataRows = jsonData.slice(1).filter(row => row.length >= 3);
        
        let armarioIndex = 0;
        const processedData: ImportedAluno[] = dataRows.map((row) => {
          // Atribuir armário automaticamente se não tiver
          const armarioAtribuido = armariosDisponiveis[armarioIndex] || null;
          armarioIndex++;

          return {
            nome: row[0]?.toString().trim() || "",
            matricula: row[1]?.toString().trim() || "",
            turma: row[2]?.toString().trim() || "",
            email: row[3]?.toString().trim() || "",
            armario: armarioAtribuido || "Sem armário",
          };
        }).filter(aluno => aluno.nome && aluno.matricula);

        setImportedData(processedData);
        toast({
          title: "Arquivo processado!",
          description: `${processedData.length} alunos encontrados na planilha.`,
        });
      } catch {
        toast({
          title: "Erro ao processar arquivo",
          description: "Verifique se o arquivo está no formato correto.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    toast({
      title: "Alunos importados com sucesso!",
      description: `${importedData.length} alunos foram cadastrados no sistema.`,
    });
    setImportedData([]);
    setOpen(false);
  };

  const handleClear = () => {
    setImportedData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="rounded-2xl gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar em Lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Importar Alunos em Lote</DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel (.xlsx) com os dados dos alunos. 
            O sistema irá atribuir armários automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Instruções */}
          <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
            <h4 className="font-semibold text-sm">Formato esperado da planilha:</h4>
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="bg-background rounded-xl p-2 text-center font-medium">
                Coluna A<br /><span className="text-muted-foreground">Nome</span>
              </div>
              <div className="bg-background rounded-xl p-2 text-center font-medium">
                Coluna B<br /><span className="text-muted-foreground">Matrícula</span>
              </div>
              <div className="bg-background rounded-xl p-2 text-center font-medium">
                Coluna C<br /><span className="text-muted-foreground">Turma</span>
              </div>
              <div className="bg-background rounded-xl p-2 text-center font-medium">
                Coluna D<br /><span className="text-muted-foreground">E-mail</span>
              </div>
              <div className="bg-background rounded-xl p-2 text-center font-medium text-primary">
                Coluna E<br /><span className="text-muted-foreground">Vazio*</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * A coluna E pode ficar vazia. O sistema atribuirá armários automaticamente.
            </p>
          </div>

          {/* Upload Area */}
          {importedData.length === 0 ? (
            <div 
              className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-1">Clique para selecionar arquivo</p>
              <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
              <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: .xlsx, .xls</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{importedData.length} alunos prontos para importar</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>

              {/* Preview Table */}
              <div className="border rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Matrícula</th>
                      <th className="text-left p-3 font-medium">Turma</th>
                      <th className="text-left p-3 font-medium">E-mail</th>
                      <th className="text-left p-3 font-medium">Armário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.slice(0, 10).map((aluno, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{aluno.nome}</td>
                        <td className="p-3 text-muted-foreground">{aluno.matricula}</td>
                        <td className="p-3">{aluno.turma}</td>
                        <td className="p-3 text-muted-foreground">{aluno.email}</td>
                        <td className="p-3">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-xs font-medium">
                            {aluno.armario}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedData.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t bg-muted/30">
                    ... e mais {importedData.length - 10} alunos
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>
                  Os armários foram atribuídos automaticamente na ordem disponível. 
                  Você pode editar depois de importar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmImport} 
            disabled={importedData.length === 0 || isProcessing}
            className="rounded-xl"
          >
            Importar {importedData.length > 0 && `${importedData.length} alunos`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
