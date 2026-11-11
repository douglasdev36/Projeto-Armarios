import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ArmarioItem, AlunoItem, TurmaItem, RelatoriosHistoricoResponse } from './api';

// Exportar para PDF
export const exportToPDF = (
  title: string,
  headers: string[],
  data: string[][],
  filename: string
) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(34, 139, 87);
  doc.text(title, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

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
      fontSize: 8.5,
      cellPadding: 3.5,
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

  const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

function sortArmariosNatural(armarios: ArmarioItem[]): ArmarioItem[] {
  return [...armarios].sort((a, b) => {
    const blocoA = (a.bloco || a.numero.split('-')[0] || '').toUpperCase();
    const blocoB = (b.bloco || b.numero.split('-')[0] || '').toUpperCase();
    if (blocoA !== blocoB) {
      return blocoA.localeCompare(blocoB, undefined, { numeric: true, sensitivity: 'base' });
    }
    return a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// 1. Relatório de Armários (Dados Reais)
export const exportArmariosRelatorio = (format: 'pdf' | 'excel', armarios: ArmarioItem[]) => {
  if (armarios.length === 0) {
    throw new Error('Nenhum armário encontrado para exportar com os filtros selecionados.');
  }

  const ordenados = sortArmariosNatural(armarios);

  if (format === 'pdf') {
    const headers = ['Armário', 'Bloco', 'Status', 'Aluno', 'Turma', 'Observação'];
    const data = ordenados.map((a) => [
      a.numero,
      a.bloco || a.numero.split('-')[0] || '-',
      a.status === 'ocupado' ? 'Ocupado' : a.status === 'manutencao' ? 'Manutenção' : 'Livre',
      a.aluno || '-',
      a.turma || '-',
      a.observacao || '-',
    ]);
    exportToPDF('Relatório de Armários', headers, data, 'relatorio-armarios');
  } else {
    const excelData = ordenados.map((a) => ({
      'Armário Nº': a.numero,
      'Bloco': a.bloco || a.numero.split('-')[0] || '-',
      'Status': a.status === 'ocupado' ? 'Ocupado' : a.status === 'manutencao' ? 'Manutenção' : 'Livre',
      'Aluno': a.aluno || '-',
      'Turma': a.turma || '-',
      'Contato': a.contato || '-',
      'Observação': a.observacao || '-',
    }));
    exportToExcel(excelData, 'Armários', 'relatorio-armarios');
  }
};

// 2. Relatório de Alunos Agrupado por Turmas (Dados Reais)
export const exportAlunosRelatorio = (format: 'pdf' | 'excel', alunos: AlunoItem[]) => {
  if (alunos.length === 0) {
    throw new Error('Nenhum aluno encontrado para exportar com os filtros selecionados.');
  }

  // Agrupa alunos por turma (preservando alunos com e sem armário)
  const gruposMap = new Map<string, AlunoItem[]>();
  for (const aluno of alunos) {
    const turmaNome = aluno.turma && aluno.turma !== '—' ? aluno.turma.trim() : 'Sem Turma';
    const lista = gruposMap.get(turmaNome) || [];
    lista.push(aluno);
    gruposMap.set(turmaNome, lista);
  }

  const turmasOrdenadas = Array.from(gruposMap.keys()).sort((a, b) => {
    if (a === 'Sem Turma') return 1;
    if (b === 'Sem Turma') return -1;
    return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
  });

  for (const turmaNome of turmasOrdenadas) {
    gruposMap.get(turmaNome)!.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  if (format === 'pdf') {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(34, 139, 87);
    doc.text('Relatório de Alunos por Turma', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Gerado em: ${new Date().toLocaleString('pt-BR')} • ${turmasOrdenadas.length} turma(s) • ${alunos.length} aluno(s)`,
      14,
      27
    );

    let currentY = 35;

    for (let idx = 0; idx < turmasOrdenadas.length; idx++) {
      const turmaNome = turmasOrdenadas[idx];
      const lista = gruposMap.get(turmaNome)!;
      const comArmario = lista.filter((a) => !!a.armario).length;
      const semArmario = lista.length - comArmario;

      const pageHeight = doc.internal.pageSize.getHeight();
      if (currentY > pageHeight - 36) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11.5);
      doc.setTextColor(22, 101, 52);
      doc.text(
        `${turmaNome} — ${lista.length} aluno(s) (${comArmario} com armário, ${semArmario} sem armário)`,
        14,
        currentY
      );

      autoTable(doc, {
        head: [['Nome', 'Matrícula', 'Armário', 'Telefone', 'E-mail', 'Observação']],
        body: lista.map((a) => [
          a.nome,
          a.matricula,
          a.armario || 'Sem armário',
          a.telefone && a.telefone !== '—' ? a.telefone : '-',
          a.email && a.email !== '—' ? a.email : '-',
          a.observacao || '-',
        ]),
        startY: currentY + 3,
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
          fontSize: 8.5,
          cellPadding: 3,
        },
        margin: { left: 14, right: 14 },
      });

      const lastY = (doc as any).lastAutoTable?.finalY ?? currentY + 20;
      currentY = lastY + 10;
    }

    doc.save('relatorio-alunos-por-turma.pdf');
  } else {
    const workbook = XLSX.utils.book_new();

    const excelData: Record<string, unknown>[] = [];
    const resumoData: Record<string, unknown>[] = [];

    for (const turmaNome of turmasOrdenadas) {
      const lista = gruposMap.get(turmaNome)!;
      const comArmario = lista.filter((a) => !!a.armario).length;
      const semArmario = lista.length - comArmario;

      resumoData.push({
        'Turma': turmaNome,
        'Total de Alunos': lista.length,
        'Com Armário': comArmario,
        'Sem Armário': semArmario,
      });

      for (const a of lista) {
        excelData.push({
          'Turma': turmaNome,
          'Nome': a.nome,
          'Matrícula': a.matricula,
          'Armário': a.armario || 'Sem armário',
          'Telefone': a.telefone && a.telefone !== '—' ? a.telefone : '-',
          'E-mail': a.email && a.email !== '—' ? a.email : '-',
          'Observação': a.observacao || '-',
        });
      }
    }

    const wsAlunos = XLSX.utils.json_to_sheet(excelData);
    wsAlunos['!cols'] = [
      { wch: 24 },
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 26 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(workbook, wsAlunos, 'Alunos por Turma');

    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, wsResumo, 'Resumo por Turma');

    XLSX.writeFile(workbook, 'relatorio-alunos-por-turma.xlsx');
  }
};

// 3. Relatório por Turma (Dados Reais)
export const exportTurmasRelatorio = (format: 'pdf' | 'excel', turmas: TurmaItem[]) => {
  if (turmas.length === 0) {
    throw new Error('Nenhuma turma encontrada para exportar.');
  }

  if (format === 'pdf') {
    const headers = ['Turma', 'Curso', 'Ano Letivo', 'Total Alunos', 'Armários Ocupados'];
    const data = turmas.map((t) => [
      t.nome,
      t.curso || '-',
      t.anoLetivo || '-',
      String(t.totalAlunos ?? 0),
      String(t.armariosOcupados ?? 0),
    ]);
    exportToPDF('Relatório por Turma', headers, data, 'relatorio-turmas');
  } else {
    const excelData = turmas.map((t) => ({
      'Turma': t.nome,
      'Curso': t.curso || '-',
      'Série': t.serie || '-',
      'Turno': t.turno || '-',
      'Ano Letivo': t.anoLetivo || '-',
      'Total Alunos': t.totalAlunos ?? 0,
      'Armários Ocupados': t.armariosOcupados ?? 0,
    }));
    exportToExcel(excelData, 'Turmas', 'relatorio-turmas');
  }
};

// 4. Relatório de Ocupação por Bloco (Dados Reais)
export const exportOcupacaoRelatorio = (
  format: 'pdf' | 'excel',
  armarios: ArmarioItem[],
  movimentacoes: RelatoriosHistoricoResponse['movimentacoes'] = []
) => {
  if (armarios.length === 0) {
    throw new Error('Não há armários cadastrados para gerar o relatório de ocupação.');
  }

  const mapaBlocos = new Map<string, { total: number; ocupados: number; livres: number }>();

  for (const a of armarios) {
    const bloco = (a.bloco || a.numero.split('-')[0] || 'Geral').toUpperCase();
    const atual = mapaBlocos.get(bloco) || { total: 0, ocupados: 0, livres: 0 };
    atual.total++;
    if (a.status === 'ocupado') atual.ocupados++;
    else if (a.status === 'livre') atual.livres++;
    mapaBlocos.set(bloco, atual);
  }

  const resumoBlocos = Array.from(mapaBlocos.entries())
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
    .map(([bloco, info]) => ({
      bloco: `Bloco ${bloco}`,
      total: info.total,
      ocupados: info.ocupados,
      livres: info.livres,
      taxa: info.total > 0 ? `${Math.round((info.ocupados / info.total) * 100)}%` : '0%',
    }));

  if (format === 'pdf') {
    const headers = ['Bloco', 'Total Armários', 'Ocupados', 'Livres', 'Taxa de Ocupação'];
    const data = resumoBlocos.map((r) => [
      r.bloco,
      String(r.total),
      String(r.ocupados),
      String(r.livres),
      r.taxa,
    ]);
    exportToPDF('Relatório de Ocupação por Bloco', headers, data, 'relatorio-ocupacao');
  } else {
    const workbook = XLSX.utils.book_new();
    const wsResumo = XLSX.utils.json_to_sheet(
      resumoBlocos.map((r) => ({
        'Bloco': r.bloco,
        'Total Armários': r.total,
        'Ocupados': r.ocupados,
        'Livres': r.livres,
        'Taxa de Ocupação': r.taxa,
      }))
    );
    wsResumo['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, wsResumo, 'Ocupação por Bloco');

    if (movimentacoes.length > 0) {
      const wsMov = XLSX.utils.json_to_sheet(
        movimentacoes.map((m) => ({
          'Data': new Date(m.createdAt).toLocaleString('pt-BR'),
          'Tipo': m.tipo,
          'Armário': m.armarioNumero,
          'Aluno': m.alunoNome || '-',
          'Detalhes': m.detalhes || '-',
        }))
      );
      wsMov['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, wsMov, 'Movimentações');
    }

    XLSX.writeFile(workbook, 'relatorio-ocupacao.xlsx');
  }
};

// 5. Armários Disponíveis (Dados Reais)
export const exportArmariosDisponiveis = (armarios: ArmarioItem[]) => {
  const livres = sortArmariosNatural(armarios.filter((a) => a.status === 'livre'));
  if (livres.length === 0) {
    throw new Error('Não há armários livres disponíveis para exportar.');
  }

  const headers = ['Armário Nº', 'Bloco', 'Status', 'Observação'];
  const data = livres.map((a) => [
    a.numero,
    a.bloco || a.numero.split('-')[0] || '-',
    'Livre',
    a.observacao || '-',
  ]);
  exportToPDF('Armários Disponíveis', headers, data, 'armarios-disponiveis');
};

// 6. Histórico de Sorteios (Dados Reais)
export const exportHistoricoSorteios = (
  sorteios: RelatoriosHistoricoResponse['sorteios']
) => {
  if (sorteios.length === 0) {
    throw new Error('Nenhum sorteio foi realizado ainda no sistema.');
  }

  const headers = ['Data', 'Identificação do Sorteio', 'Turma', 'Aluno', 'Armário'];
  const data = sorteios.map((s) => [
    new Date(s.createdAt).toLocaleDateString('pt-BR'),
    s.nomeSorteio || 'Sorteio',
    s.turma || '-',
    s.alunoNome,
    s.armario,
  ]);
  exportToPDF('Histórico de Sorteios', headers, data, 'historico-sorteios');
};
