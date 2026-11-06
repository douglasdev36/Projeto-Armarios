import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ArmarioData {
  numero: string;
  status: string;
  aluno: string;
  turma: string;
  contato: string;
}

interface AlunoData {
  nome: string;
  matricula: string;
  turma: string;
  armario: string;
  contato: string;
}

interface TurmaData {
  nome: string;
  totalAlunos: number;
  armariosOcupados: number;
  armariosLivres: number;
}

// Dados de exemplo
export const getArmariosData = (): ArmarioData[] => [
  { numero: "A1", status: "Ocupado", aluno: "Carlos Pereira", turma: "9º A", contato: "(11) 98765-4321" },
  { numero: "A2", status: "Livre", aluno: "-", turma: "-", contato: "-" },
  { numero: "A3", status: "Ocupado", aluno: "Beatriz Lima", turma: "8º C", contato: "beatriz@email.com" },
  { numero: "A4", status: "Ocupado", aluno: "Daniel Costa", turma: "9º B", contato: "(21) 99999-8888" },
  { numero: "A5", status: "Livre", aluno: "-", turma: "-", contato: "-" },
  { numero: "B41", status: "Ocupado", aluno: "Fernanda Santos", turma: "7º A", contato: "(11) 97777-6666" },
  { numero: "B42", status: "Livre", aluno: "-", turma: "-", contato: "-" },
];

export const getAlunosData = (): AlunoData[] => [
  { nome: "Carlos Pereira", matricula: "2024001", turma: "9º A", armario: "A1", contato: "(11) 98765-4321" },
  { nome: "Beatriz Lima", matricula: "2024002", turma: "8º C", armario: "A3", contato: "beatriz@email.com" },
  { nome: "Daniel Costa", matricula: "2024003", turma: "9º B", armario: "A4", contato: "(21) 99999-8888" },
  { nome: "Fernanda Santos", matricula: "2024004", turma: "7º A", armario: "B41", contato: "(11) 97777-6666" },
];

export const getTurmasData = (): TurmaData[] => [
  { nome: "7º A", totalAlunos: 30, armariosOcupados: 28, armariosLivres: 2 },
  { nome: "8º C", totalAlunos: 32, armariosOcupados: 30, armariosLivres: 2 },
  { nome: "9º A", totalAlunos: 28, armariosOcupados: 25, armariosLivres: 3 },
  { nome: "9º B", totalAlunos: 31, armariosOcupados: 29, armariosLivres: 2 },
];

// Exportar para PDF
export const exportToPDF = (
  title: string, 
  headers: string[], 
  data: string[][], 
  filename: string
) => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.setTextColor(34, 139, 87); // Verde
  doc.text(title, 14, 22);
  
  // Data
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  
  // Tabela
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 38,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 139, 87],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
  });
  
  doc.save(`${filename}.pdf`);
};

// Exportar para Excel
export const exportToExcel = (
  data: Record<string, unknown>[],
  sheetName: string,
  filename: string
) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Ajustar largura das colunas
  const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 18 }));
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// Funções específicas de exportação
export const exportArmariosRelatorio = (format: 'pdf' | 'excel') => {
  const armarios = getArmariosData();
  
  if (format === 'pdf') {
    const headers = ['Armário Nº', 'Status', 'Aluno', 'Turma', 'Contato'];
    const data = armarios.map(a => [a.numero, a.status, a.aluno, a.turma, a.contato]);
    exportToPDF('Relatório de Armários', headers, data, 'relatorio-armarios');
  } else {
    const excelData = armarios.map(a => ({
      'Armário Nº': a.numero,
      'Status': a.status,
      'Aluno': a.aluno,
      'Turma': a.turma,
      'Contato': a.contato,
    }));
    exportToExcel(excelData, 'Armários', 'relatorio-armarios');
  }
};

export const exportAlunosRelatorio = (format: 'pdf' | 'excel') => {
  const alunos = getAlunosData();
  
  if (format === 'pdf') {
    const headers = ['Nome', 'Matrícula', 'Turma', 'Armário', 'Contato'];
    const data = alunos.map(a => [a.nome, a.matricula, a.turma, a.armario, a.contato]);
    exportToPDF('Relatório de Alunos', headers, data, 'relatorio-alunos');
  } else {
    const excelData = alunos.map(a => ({
      'Nome': a.nome,
      'Matrícula': a.matricula,
      'Turma': a.turma,
      'Armário': a.armario,
      'Contato': a.contato,
    }));
    exportToExcel(excelData, 'Alunos', 'relatorio-alunos');
  }
};

export const exportTurmasRelatorio = (format: 'pdf' | 'excel') => {
  const turmas = getTurmasData();
  
  if (format === 'pdf') {
    const headers = ['Turma', 'Total Alunos', 'Armários Ocupados', 'Armários Livres'];
    const data = turmas.map(t => [
      t.nome, 
      t.totalAlunos.toString(), 
      t.armariosOcupados.toString(), 
      t.armariosLivres.toString()
    ]);
    exportToPDF('Relatório por Turma', headers, data, 'relatorio-turmas');
  } else {
    const excelData = turmas.map(t => ({
      'Turma': t.nome,
      'Total Alunos': t.totalAlunos,
      'Armários Ocupados': t.armariosOcupados,
      'Armários Livres': t.armariosLivres,
    }));
    exportToExcel(excelData, 'Turmas', 'relatorio-turmas');
  }
};

export const exportOcupacaoRelatorio = (format: 'pdf' | 'excel') => {
  const ocupacao = [
    { periodo: 'Janeiro/2024', ocupados: 120, livres: 30, taxa: '80%' },
    { periodo: 'Fevereiro/2024', ocupados: 125, livres: 25, taxa: '83%' },
    { periodo: 'Março/2024', ocupados: 130, livres: 20, taxa: '87%' },
    { periodo: 'Abril/2024', ocupados: 128, livres: 22, taxa: '85%' },
  ];
  
  if (format === 'pdf') {
    const headers = ['Período', 'Ocupados', 'Livres', 'Taxa de Ocupação'];
    const data = ocupacao.map(o => [o.periodo, o.ocupados.toString(), o.livres.toString(), o.taxa]);
    exportToPDF('Relatório de Ocupação', headers, data, 'relatorio-ocupacao');
  } else {
    const excelData = ocupacao.map(o => ({
      'Período': o.periodo,
      'Ocupados': o.ocupados,
      'Livres': o.livres,
      'Taxa de Ocupação': o.taxa,
    }));
    exportToExcel(excelData, 'Ocupação', 'relatorio-ocupacao');
  }
};

export const exportArmariosDisponiveis = () => {
  const armarios = getArmariosData().filter(a => a.status === 'Livre');
  const headers = ['Armário Nº', 'Status'];
  const data = armarios.map(a => [a.numero, a.status]);
  exportToPDF('Armários Disponíveis', headers, data, 'armarios-disponiveis');
};

export const exportHistoricoSorteios = () => {
  const historico = [
    { data: '15/02/2024', turma: '9º A', participantes: 28, sorteados: 28 },
    { data: '16/02/2024', turma: '9º B', participantes: 30, sorteados: 30 },
    { data: '17/02/2024', turma: '8º C', participantes: 32, sorteados: 32 },
  ];
  const headers = ['Data', 'Turma', 'Participantes', 'Sorteados'];
  const data = historico.map(h => [h.data, h.turma, h.participantes.toString(), h.sorteados.toString()]);
  exportToPDF('Histórico de Sorteios', headers, data, 'historico-sorteios');
};
