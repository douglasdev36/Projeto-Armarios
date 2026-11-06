import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, createToken, hashPassword, verifyPassword } from './auth.ts';
import type { AuthenticatedRequest } from './auth.ts';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- HEALTHCHECK (Público) ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'PostgreSQL Active (Docker)' });
});

// --- AUTENTICAÇÃO ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Informe o e-mail e a senha' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const senhaValida = verifyPassword(password, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = createToken({
      userId: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      role: usuario.role,
    });

    res.json({
      token,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Erro interno ao realizar login' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.userId },
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// Middleware de proteção para todas as demais rotas da API
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/auth/login') {
    return next();
  }
  return authMiddleware(req as AuthenticatedRequest, res, next);
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalArmarios = await prisma.armario.count();
    const armariosLivres = await prisma.armario.count({ where: { status: 'livre' } });
    const armariosOcupados = await prisma.armario.count({ where: { status: 'ocupado' } });
    const totalAlunos = await prisma.aluno.count({ where: { ativo: true } });

    res.json({
      totalArmarios,
      armariosDisponiveis: armariosLivres,
      armariosOcupados,
      totalAlunos,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard' });
  }
});

// ==========================================
// MÓDULO DE TURMAS
// ==========================================

app.get('/api/turmas', async (req, res) => {
  try {
    const turmas = await prisma.turma.findMany({
      include: {
        alunos: {
          where: { ativo: true },
          include: {
            armario: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    const formatted = turmas.map((t) => {
      const totalAlunos = t.alunos.length;
      const armariosOcupados = t.alunos.filter((a) => a.armario !== null).length;
      const armariosLivres = Math.max(0, totalAlunos - armariosOcupados);

      return {
        id: t.id,
        nome: t.nome,
        anoLetivo: t.anoLetivo || '2024',
        curso: t.curso || 'Ensino Regular',
        serie: t.serie || 'Geral',
        turno: t.turno || 'Manhã',
        totalAlunos,
        armariosOcupados,
        armariosLivres,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching turmas:', error);
    res.status(500).json({ error: 'Erro ao buscar turmas' });
  }
});

app.post('/api/turmas', async (req, res) => {
  try {
    const { nome, anoLetivo, curso, serie, turno } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome da turma é obrigatório' });
    }

    const turma = await prisma.turma.create({
      data: {
        nome,
        anoLetivo: anoLetivo || '2024',
        curso: curso || 'Ensino Regular',
        serie: serie || 'Geral',
        turno: turno || 'Manhã',
      },
    });
    res.status(201).json(turma);
  } catch (error: any) {
    console.error('Error creating turma:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Turma já cadastrada' });
    }
    res.status(500).json({ error: 'Erro ao criar turma' });
  }
});

// 2.1. Visualização detalhada dos alunos por turma
app.get('/api/turmas/:id/detalhes', async (req, res) => {
  try {
    const { id } = req.params;
    const turma = await prisma.turma.findUnique({
      where: { id },
      include: {
        alunos: {
          where: { ativo: true },
          include: {
            armario: true,
          },
          orderBy: { nome: 'asc' },
        },
      },
    });

    if (!turma) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    res.json({
      id: turma.id,
      nome: turma.nome,
      anoLetivo: turma.anoLetivo,
      curso: turma.curso || 'Ensino Regular',
      serie: turma.serie || 'Geral',
      turno: turma.turno || 'Manhã',
      qtdAlunos: turma.alunos.length,
      alunos: turma.alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        matricula: a.matricula,
        telefone: a.telefone || '—',
        email: a.email || '—',
        armario: a.armario?.numero || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching turma details:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da turma' });
  }
});

// 2.2. Desvinculação/exclusão individual de aluno da turma (Preserva histórico)
app.delete('/api/turmas/:turmaId/alunos/:alunoId', async (req: AuthenticatedRequest, res) => {
  try {
    const { alunoId } = req.params;

    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    // Desvincula o aluno da turma mantendo seu cadastro e armário intactos
    await prisma.aluno.update({
      where: { id: alunoId },
      data: { turmaId: null },
    });

    res.json({ message: 'Aluno desvinculado da turma com sucesso! O cadastro foi preservado.' });
  } catch (error) {
    console.error('Error unlinking student from class:', error);
    res.status(500).json({ error: 'Erro ao desvincular aluno da turma' });
  }
});

// 2.3. Promoção seletiva de turmas com transação atômica
app.post('/api/turmas/promover-seletivo', async (req: AuthenticatedRequest, res) => {
  try {
    const { turmaOrigemId, turmaDestinoId, alunoIdsSelecionados } = req.body;

    if (!turmaOrigemId || !turmaDestinoId) {
      return res.status(400).json({ error: 'Turma de origem e turma de destino são obrigatórias' });
    }

    if (turmaOrigemId === turmaDestinoId) {
      return res.status(400).json({ error: 'A turma de destino deve ser diferente da turma de origem' });
    }

    const [turmaOrigem, turmaDestino] = await Promise.all([
      prisma.turma.findUnique({
        where: { id: turmaOrigemId },
        include: { alunos: { where: { ativo: true } } },
      }),
      prisma.turma.findUnique({ where: { id: turmaDestinoId } }),
    ]);

    if (!turmaOrigem || !turmaDestino) {
      return res.status(404).json({ error: 'Turma de origem ou destino não encontrada' });
    }

    const selecionadosSet = new Set(Array.isArray(alunoIdsSelecionados) ? alunoIdsSelecionados : []);
    const totalOrigem = turmaOrigem.alunos.length;
    const promovidosAlunos = turmaOrigem.alunos.filter((a) => selecionadosSet.has(a.id));
    const retidosAlunos = turmaOrigem.alunos.filter((a) => !selecionadosSet.has(a.id));

    // Executa atomicamente via $transaction
    await prisma.$transaction(async (tx) => {
      // Promover selecionados para a nova turma
      if (promovidosAlunos.length > 0) {
        await tx.aluno.updateMany({
          where: { id: { in: promovidosAlunos.map((a) => a.id) } },
          data: { turmaId: turmaDestinoId },
        });
      }

      // Os retidos permanecem na turmaOrigem (já estão nela)
      // Registrar no histórico de promoção
      await tx.historicoPromocao.create({
        data: {
          turmaOrigemId,
          turmaOrigemNome: turmaOrigem.nome,
          turmaDestinoId,
          turmaDestinoNome: turmaDestino.nome,
          qtdPromovidos: promovidosAlunos.length,
          qtdRetidos: retidosAlunos.length,
          responsavelEmail: req.user?.email || 'admin',
        },
      });
    });

    res.json({
      message: 'Promoção seletiva realizada com sucesso!',
      resumo: {
        turmaOrigem: turmaOrigem.nome,
        turmaDestino: turmaDestino.nome,
        totalAlunos: totalOrigem,
        qtdPromovidos: promovidosAlunos.length,
        qtdRetidos: retidosAlunos.length,
      },
    });
  } catch (error) {
    console.error('Error in selective promotion:', error);
    res.status(500).json({ error: 'Erro ao processar promoção seletiva de turmas' });
  }
});

// ==========================================
// MÓDULO DE ARMÁRIOS
// ==========================================

app.get('/api/armarios', async (req, res) => {
  try {
    const armarios = await prisma.armario.findMany({
      include: {
        aluno: {
          include: {
            turma: true,
          },
        },
      },
      orderBy: { numero: 'asc' },
    });

    const formatted = armarios.map((a) => ({
      id: a.id,
      numero: a.numero,
      bloco: a.bloco,
      status: a.status,
      dataDistribuicao: a.dataDistribuicao,
      aluno: a.aluno?.nome || null,
      turma: a.aluno?.turma?.nome || null,
      contato: a.aluno?.telefone || a.aluno?.email || null,
      alunoId: a.alunoId,
    }));

    // Ordenação natural inteligente: Bloco A primeiro (A-1, A-2... A-10), depois Bloco B, etc.
    formatted.sort((a, b) => {
      const blocoA = (a.bloco || a.numero.split('-')[0] || '').toUpperCase();
      const blocoB = (b.bloco || b.numero.split('-')[0] || '').toUpperCase();
      if (blocoA !== blocoB) {
        return blocoA.localeCompare(blocoB, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.numero.localeCompare(b.numero, undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching armarios:', error);
    res.status(500).json({ error: 'Erro ao buscar armários' });
  }
});

// 3.2. Distribuição manual de armários
app.post('/api/armarios/distribuir', async (req: AuthenticatedRequest, res) => {
  try {
    const { armarioId, alunoId } = req.body;

    if (!armarioId || !alunoId) {
      return res.status(400).json({ error: 'Armário e Aluno são obrigatórios' });
    }

    const armario = await prisma.armario.findUnique({ where: { id: armarioId } });
    if (!armario) return res.status(404).json({ error: 'Armário não encontrado' });

    if (armario.status !== 'livre') {
      return res.status(400).json({ error: 'Este armário já está ocupado ou em manutenção' });
    }

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: { armario: true },
    });
    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

    if (aluno.armario) {
      return res.status(400).json({
        error: `O aluno ${aluno.nome} já possui o armário ativo ${aluno.armario.numero}. Não é permitido 2 armários ativos.`,
      });
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.armario.update({
        where: { id: armarioId },
        data: {
          status: 'ocupado',
          alunoId,
          dataDistribuicao: now,
        },
      }),
      prisma.historicoArmario.create({
        data: {
          armarioNumero: armario.numero,
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          tipo: 'distribuicao',
          responsavelEmail: req.user?.email,
          detalhes: 'Distribuição manual de armário',
        },
      }),
    ]);

    res.json({ message: `Armário ${armario.numero} distribuído com sucesso para ${aluno.nome}!` });
  } catch (error) {
    console.error('Error distributing locker:', error);
    res.status(500).json({ error: 'Erro ao distribuir armário' });
  }
});

// 3.3. Liberação de armários
app.post('/api/armarios/liberar', async (req: AuthenticatedRequest, res) => {
  try {
    const { armarioId } = req.body;
    if (!armarioId) return res.status(400).json({ error: 'ID do armário é obrigatório' });

    const armario = await prisma.armario.findUnique({
      where: { id: armarioId },
      include: { aluno: true },
    });

    if (!armario) return res.status(404).json({ error: 'Armário não encontrado' });

    const alunoNome = armario.aluno?.nome || 'Não identificado';
    const alunoId = armario.alunoId;

    await prisma.$transaction([
      prisma.armario.update({
        where: { id: armarioId },
        data: {
          status: 'livre',
          alunoId: null,
          dataDistribuicao: null,
        },
      }),
      prisma.historicoArmario.create({
        data: {
          armarioNumero: armario.numero,
          alunoId,
          alunoNome,
          tipo: 'liberacao',
          responsavelEmail: req.user?.email,
          detalhes: `Armário liberado. Anteriormente utilizado por ${alunoNome}`,
        },
      }),
    ]);

    res.json({ message: `Armário ${armario.numero} liberado com sucesso!` });
  } catch (error) {
    console.error('Error releasing locker:', error);
    res.status(500).json({ error: 'Erro ao liberar armário' });
  }
});

// 3.4. Troca de armários segura
app.post('/api/armarios/trocar', async (req: AuthenticatedRequest, res) => {
  try {
    const { alunoId, novoArmarioId } = req.body;

    if (!alunoId || !novoArmarioId) {
      return res.status(400).json({ error: 'Aluno e Novo Armário são obrigatórios' });
    }

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: { armario: true },
    });

    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });
    if (!aluno.armario) {
      return res.status(400).json({ error: 'Este aluno não possui um armário atual para realizar a troca' });
    }

    const novoArmario = await prisma.armario.findUnique({ where: { id: novoArmarioId } });
    if (!novoArmario) return res.status(404).json({ error: 'Novo armário não encontrado' });
    if (novoArmario.status !== 'livre') {
      return res.status(400).json({ error: 'O armário de destino não está livre' });
    }

    const armarioAntigoNumero = aluno.armario.numero;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Liberar o armário antigo
      await tx.armario.update({
        where: { id: aluno.armario!.id },
        data: { status: 'livre', alunoId: null, dataDistribuicao: null },
      });

      // Ocupar o novo armário
      await tx.armario.update({
        where: { id: novoArmarioId },
        data: { status: 'ocupado', alunoId: aluno.id, dataDistribuicao: now },
      });

      // Registrar histórico de troca
      await tx.historicoArmario.create({
        data: {
          armarioNumero: novoArmario.numero,
          armarioAnterior: armarioAntigoNumero,
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          tipo: 'troca',
          responsavelEmail: req.user?.email,
          detalhes: `Troca de armário: de ${armarioAntigoNumero} para ${novoArmario.numero}`,
        },
      });
    });

    res.json({
      message: `Troca concluída com sucesso! Aluno transferido do armário ${armarioAntigoNumero} para ${novoArmario.numero}.`,
    });
  } catch (error) {
    console.error('Error swapping locker:', error);
    res.status(500).json({ error: 'Erro ao realizar troca de armário' });
  }
});

// 3.5. Exclusão individual de armário
app.delete('/api/armarios/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const armario = await prisma.armario.findUnique({ where: { id } });
    if (!armario) return res.status(404).json({ error: 'Armário não encontrado' });

    if (armario.status === 'ocupado' || armario.alunoId) {
      return res.status(400).json({
        error: `Não é possível excluir o armário ${armario.numero} pois ele está ocupado por um aluno. Libere-o antes de excluir.`,
      });
    }

    await prisma.armario.delete({ where: { id } });
    res.json({ message: `Armário ${armario.numero} excluído com sucesso.` });
  } catch (error) {
    console.error('Error deleting locker:', error);
    res.status(500).json({ error: 'Erro ao excluir armário' });
  }
});

// 3.5. Prévia de exclusão por prefixo e intervalo
app.post('/api/armarios/excluir-lote-preview', async (req, res) => {
  try {
    const { prefixo, inicio, fim } = req.body;
    const start = parseInt(inicio, 10);
    const end = parseInt(fim, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      return res.status(400).json({ error: 'Intervalo numérico inválido' });
    }

    const numerosEsperados: string[] = [];
    for (let i = start; i <= end; i++) {
      numerosEsperados.push(`${prefixo}-${i}`);
    }

    const armariosEncontrados = await prisma.armario.findMany({
      where: { numero: { in: numerosEsperados } },
      include: { aluno: true },
    });

    const livres = armariosEncontrados.filter((a) => a.status === 'livre').length;
    const ocupados = armariosEncontrados.filter((a) => a.status === 'ocupado').length;

    res.json({
      prefixo,
      inicio: start,
      fim: end,
      totalEncontrados: armariosEncontrados.length,
      livres,
      ocupados,
      podeExcluirTudo: ocupados === 0,
      armarios: armariosEncontrados.map((a) => ({
        id: a.id,
        numero: a.numero,
        status: a.status,
        aluno: a.aluno?.nome || null,
      })),
    });
  } catch (error) {
    console.error('Error previewing batch deletion:', error);
    res.status(500).json({ error: 'Erro ao calcular prévia de exclusão' });
  }
});

// 3.5. Exclusão em lote por prefixo e intervalo
app.post('/api/armarios/excluir-lote', async (req: AuthenticatedRequest, res) => {
  try {
    const { prefixo, inicio, fim, apenasLivres } = req.body;
    const start = parseInt(inicio, 10);
    const end = parseInt(fim, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      return res.status(400).json({ error: 'Intervalo numérico inválido' });
    }

    const numerosEsperados: string[] = [];
    for (let i = start; i <= end; i++) {
      numerosEsperados.push(`${prefixo}-${i}`);
    }

    const ocupadosCount = await prisma.armario.count({
      where: { numero: { in: numerosEsperados }, status: 'ocupado' },
    });

    if (ocupadosCount > 0 && !apenasLivres) {
      return res.status(400).json({
        error: `Existem ${ocupadosCount} armários ocupados no intervalo selecionado. Resolva ou libere os armários antes da exclusão.`,
      });
    }

    const whereClause: any = { numero: { in: numerosEsperados } };
    if (apenasLivres) {
      whereClause.status = 'livre';
    }

    const deleteRes = await prisma.armario.deleteMany({ where: whereClause });

    res.json({
      message: `${deleteRes.count} armários foram excluídos com sucesso.`,
      excluidosCount: deleteRes.count,
    });
  } catch (error) {
    console.error('Error in batch deletion:', error);
    res.status(500).json({ error: 'Erro ao excluir armários em lote' });
  }
});

app.post('/api/armarios/gerar-lote', async (req, res) => {
  try {
    const { bloco, inicio, fim } = req.body;
    const start = parseInt(inicio, 10);
    const end = parseInt(fim, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      return res.status(400).json({ error: 'Intervalo inválido' });
    }

    const criados = [];
    for (let i = start; i <= end; i++) {
      const numero = `${bloco}-${i}`;
      try {
        const item = await prisma.armario.upsert({
          where: { numero },
          update: {},
          create: { numero, bloco, status: 'livre' },
        });
        criados.push(item);
      } catch {
        // Ignora duplicados
      }
    }

    res.json({ message: `${criados.length} armários criados/verificados com sucesso`, criados });
  } catch (error) {
    console.error('Error batch creating armarios:', error);
    res.status(500).json({ error: 'Erro ao gerar armários em lote' });
  }
});

// ==========================================
// MÓDULO DE ALUNOS
// ==========================================

app.get('/api/alunos', async (req, res) => {
  try {
    const { turmaId } = req.query;
    const where: any = { ativo: true };
    if (turmaId && typeof turmaId === 'string' && turmaId !== 'todas') {
      where.turmaId = turmaId;
    }

    const alunos = await prisma.aluno.findMany({
      where,
      include: {
        turma: true,
        armario: true,
      },
      orderBy: { nome: 'asc' },
    });

    const formatted = alunos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome,
      matricula: aluno.matricula,
      telefone: aluno.telefone || '—',
      email: aluno.email || '—',
      turma: aluno.turma?.nome || '—',
      turmaId: aluno.turmaId,
      armario: aluno.armario?.numero || null,
      armarioId: aluno.armario?.id || null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching alunos:', error);
    res.status(500).json({ error: 'Erro ao buscar alunos' });
  }
});

app.post('/api/alunos', async (req, res) => {
  try {
    const { nome, matricula, telefone, email, turmaId } = req.body;
    const novoAluno = await prisma.aluno.create({
      data: { nome, matricula, telefone, email, turmaId: turmaId || null },
    });
    res.status(201).json(novoAluno);
  } catch (error: any) {
    console.error('Error creating aluno:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe um aluno com essa matrícula' });
    }
    res.status(500).json({ error: 'Erro ao cadastrar aluno' });
  }
});

app.delete('/api/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete para preservar integridade e históricos
    await prisma.aluno.update({
      where: { id },
      data: { ativo: false },
    });

    // Se tinha armário, libera o armário
    const armario = await prisma.armario.findFirst({ where: { alunoId: id } });
    if (armario) {
      await prisma.armario.update({
        where: { id: armario.id },
        data: { status: 'livre', alunoId: null, dataDistribuicao: null },
      });
    }

    res.json({ message: 'Aluno inativado e armário liberado com sucesso.' });
  } catch (error) {
    console.error('Error deleting aluno:', error);
    res.status(500).json({ error: 'Erro ao remover aluno' });
  }
});

app.put('/api/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, matricula, telefone, email, turmaId, turma, armario } = req.body;

    const alunoAntigo = await prisma.aluno.findUnique({
      where: { id },
      include: { armario: true },
    });

    if (!alunoAntigo) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    let finalTurmaId = turmaId;
    if (!finalTurmaId && turma) {
      const t = await prisma.turma.findFirst({ where: { nome: turma } });
      if (t) finalTurmaId = t.id;
    }

    const alunoAtualizado = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.aluno.update({
        where: { id },
        data: {
          nome: nome !== undefined ? nome : alunoAntigo.nome,
          matricula: matricula !== undefined ? matricula : alunoAntigo.matricula,
          telefone: telefone !== undefined ? telefone : alunoAntigo.telefone,
          email: email !== undefined ? email : alunoAntigo.email,
          turmaId: finalTurmaId !== undefined ? finalTurmaId : alunoAntigo.turmaId,
        },
      });

      const armarioAntigoNumero = alunoAntigo.armario?.numero;
      if (armario !== undefined && armario !== armarioAntigoNumero) {
        if (alunoAntigo.armario) {
          await tx.armario.update({
            where: { id: alunoAntigo.armario.id },
            data: { status: 'livre', alunoId: null, dataDistribuicao: null },
          });
        }

        if (armario && armario !== 'none') {
          const novoArmarioObj = await tx.armario.findFirst({ where: { numero: armario } });
          if (novoArmarioObj) {
            await tx.armario.update({
              where: { id: novoArmarioObj.id },
              data: { status: 'ocupado', alunoId: id, dataDistribuicao: new Date() },
            });
          }
        }
      }

      return atualizado;
    });

    res.json(alunoAtualizado);
  } catch (error) {
    console.error('Error updating aluno:', error);
    res.status(500).json({ error: 'Erro ao atualizar aluno' });
  }
});

// ==========================================
// MÓDULO DE SORTEIO MULTI-PREFIXO E INTERVALOS
// ==========================================

// 4.1 e 4.2. Prévia de sorteio combinando múltiplos grupos de prefixos
app.post('/api/sorteio/multi-preview', async (req, res) => {
  try {
    const { grupos, alunoIds, turmaId } = req.body;
    // grupos: Array<{ prefixo: string, inicio: number, fim: number }>

    if (!Array.isArray(grupos) || grupos.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos um grupo de prefixo e intervalo' });
    }

    // Coleta todos os números de armários dos grupos solicitados
    const numerosParaBuscar = new Set<string>();
    for (const g of grupos) {
      const start = parseInt(g.inicio, 10);
      const end = parseInt(g.fim, 10);
      const prefixo = (g.prefixo || 'A').toUpperCase().trim();
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          numerosParaBuscar.add(`${prefixo}-${i}`);
        }
      }
    }

    // Busca armários livres dentro desses números
    const armariosLivres = await prisma.armario.findMany({
      where: {
        numero: { in: Array.from(numerosParaBuscar) },
        status: 'livre',
      },
      orderBy: { numero: 'asc' },
    });

    // Busca os alunos participantes
    let alunosParticipantes: any[] = [];
    if (Array.isArray(alunoIds) && alunoIds.length > 0) {
      alunosParticipantes = await prisma.aluno.findMany({
        where: { id: { in: alunoIds }, ativo: true },
        include: { turma: true, armario: true },
      });
    } else if (turmaId) {
      alunosParticipantes = await prisma.aluno.findMany({
        where: { turmaId, ativo: true },
        include: { turma: true, armario: true },
      });
    } else {
      // Todos os alunos sem armário
      alunosParticipantes = await prisma.aluno.findMany({
        where: { ativo: true, armario: null },
        include: { turma: true, armario: true },
      });
    }

    // Filtra apenas alunos que ainda NÃO possuem armário ativo
    const alunosSemArmario = alunosParticipantes.filter((a) => !a.armario);

    res.json({
      totalArmariosLivres: armariosLivres.length,
      armariosLivres: armariosLivres.map((a) => ({ id: a.id, numero: a.numero, bloco: a.bloco })),
      totalAlunosParticipantes: alunosSemArmario.length,
      alunos: alunosSemArmario.map((a) => ({
        id: a.id,
        nome: a.nome,
        matricula: a.matricula,
        turma: a.turma?.nome || '—',
      })),
      suficiente: armariosLivres.length >= alunosSemArmario.length,
      diferenca: armariosLivres.length - alunosSemArmario.length,
    });
  } catch (error) {
    console.error('Error previewing multi lottery:', error);
    res.status(500).json({ error: 'Erro ao gerar prévia do sorteio' });
  }
});

// 4.3 e 4.4. Execução atômica do sorteio combinado com confirmação
app.post('/api/sorteio/executar-multi', async (req: AuthenticatedRequest, res) => {
  try {
    const { nomeSorteio, grupos, alunoIds } = req.body;

    if (!Array.isArray(grupos) || grupos.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos um grupo de armários' });
    }

    if (!Array.isArray(alunoIds) || alunoIds.length === 0) {
      return res.status(400).json({ error: 'Selecione ao menos um aluno para o sorteio' });
    }

    const numerosParaBuscar = new Set<string>();
    for (const g of grupos) {
      const start = parseInt(g.inicio, 10);
      const end = parseInt(g.fim, 10);
      const prefixo = (g.prefixo || 'A').toUpperCase().trim();
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          numerosParaBuscar.add(`${prefixo}-${i}`);
        }
      }
    }

    const armariosLivres = await prisma.armario.findMany({
      where: {
        numero: { in: Array.from(numerosParaBuscar) },
        status: 'livre',
      },
    });

    const alunosParticipantes = await prisma.aluno.findMany({
      where: {
        id: { in: alunoIds },
        ativo: true,
        armario: null,
      },
      include: { turma: true },
    });

    if (armariosLivres.length === 0) {
      return res.status(400).json({ error: 'Não há armários livres disponíveis nos intervalos informados' });
    }

    if (alunosParticipantes.length === 0) {
      return res.status(400).json({ error: 'Nenhum dos alunos selecionados está apto a receber armário' });
    }

    // Embaralha aleatoriamente os armários
    const armariosShuffled = [...armariosLivres].sort(() => Math.random() - 0.5);
    const qtdParaSortear = Math.min(alunosParticipantes.length, armariosShuffled.length);

    const now = new Date();
    const tituloSorteio = nomeSorteio?.trim() || `Sorteio ${now.toLocaleDateString('pt-BR')}`;

    const resultados = await prisma.$transaction(async (tx) => {
      const transResultados = [];

      for (let i = 0; i < qtdParaSortear; i++) {
        const aluno = alunosParticipantes[i];
        const armario = armariosShuffled[i];

        await tx.armario.update({
          where: { id: armario.id },
          data: {
            status: 'ocupado',
            alunoId: aluno.id,
            dataDistribuicao: now,
          },
        });

        await tx.sorteioResultado.create({
          data: {
            alunoNome: aluno.nome,
            armario: armario.numero,
            turma: aluno.turma?.nome || null,
            nomeSorteio: tituloSorteio,
          },
        });

        await tx.historicoArmario.create({
          data: {
            armarioNumero: armario.numero,
            alunoId: aluno.id,
            alunoNome: aluno.nome,
            tipo: 'sorteio',
            responsavelEmail: req.user?.email,
            detalhes: `Contemplado no sorteio: ${tituloSorteio}`,
          },
        });

        transResultados.push({
          aluno: aluno.nome,
          matricula: aluno.matricula,
          turma: aluno.turma?.nome || '—',
          armario: armario.numero,
          data: now.toISOString(),
        });
      }

      return transResultados;
    });

    res.json({
      message: `Sorteio finalizado com sucesso! ${resultados.length} alunos foram contemplados.`,
      resultados,
    });
  } catch (error) {
    console.error('Error executing multi lottery:', error);
    res.status(500).json({ error: 'Erro ao executar sorteio combinado' });
  }
});

// ==========================================
// MÓDULO DE EMPRÉSTIMO DE CHAVES
// ==========================================

// 6.3. Alertas de chaves emprestadas
app.get('/api/chaves/alertas', async (req, res) => {
  try {
    const pendentes = await prisma.emprestimoChave.findMany({
      where: { status: 'pendente' },
      orderBy: { prazoDevolucao: 'asc' },
    });

    const now = new Date();
    let atrasadasCount = 0;
    let proximasCount = 0;
    let normaisCount = 0;

    const listaComStatus = pendentes.map((item) => {
      const diffMs = item.prazoDevolucao.getTime() - now.getTime();
      const horasRestantes = Math.round(diffMs / (1000 * 60 * 60));
      let statusCalculado = 'pendente';

      if (diffMs < 0) {
        statusCalculado = 'atrasada';
        atrasadasCount++;
      } else if (horasRestantes <= 12) {
        statusCalculado = 'proxima';
        proximasCount++;
      } else {
        normaisCount++;
      }

      return {
        ...item,
        statusCalculado,
        horasRestantes,
      };
    });

    res.json({
      totalPendentes: pendentes.length,
      atrasadasCount,
      proximasCount,
      normaisCount,
      alertas: listaComStatus,
    });
  } catch (error) {
    console.error('Error fetching key loan alerts:', error);
    res.status(500).json({ error: 'Erro ao buscar alertas de chaves' });
  }
});

// Lista todos os empréstimos com busca e filtros
app.get('/api/chaves/listar', async (req, res) => {
  try {
    const { status, search } = req.query;
    const where: any = {};

    if (status && status !== 'todos') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { alunoNome: { contains: search, mode: 'insensitive' } },
        { armarioNumero: { contains: search, mode: 'insensitive' } },
      ];
    }

    const emprestimos = await prisma.emprestimoChave.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const formatted = emprestimos.map((e) => {
      let estado = e.status;
      if (e.status === 'pendente' && e.prazoDevolucao < now) {
        estado = 'atrasada';
      }
      return {
        ...e,
        estadoVisual: estado,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error listing key loans:', error);
    res.status(500).json({ error: 'Erro ao listar empréstimos de chaves' });
  }
});

// 6.1. Registrar novo empréstimo de chave (prazo 2 dias)
app.post('/api/chaves/emprestar', async (req: AuthenticatedRequest, res) => {
  try {
    const { alunoId, armarioNumero, observacoes } = req.body;

    if (!alunoId) {
      return res.status(400).json({ error: 'Aluno é obrigatório' });
    }

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: { armario: true },
    });

    if (!aluno) return res.status(404).json({ error: 'Aluno não encontrado' });

    const numeroArmarioFinal = aluno.armario?.numero || armarioNumero;

    if (!numeroArmarioFinal) {
      return res.status(400).json({
        error: `O aluno ${aluno.nome} não possui um armário vinculado. Selecione o armário para o empréstimo da chave.`,
      });
    }

    // Prazo padrão: exatamente 2 dias (48 horas)
    const dataEmprestimo = new Date();
    const prazoDevolucao = new Date(dataEmprestimo.getTime() + 2 * 24 * 60 * 60 * 1000);

    const novoEmprestimo = await prisma.emprestimoChave.create({
      data: {
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        armarioNumero: numeroArmarioFinal,
        dataEmprestimo,
        prazoDevolucao,
        responsavelEmprestimo: req.user?.nome || req.user?.email || 'Coordenador',
        status: 'pendente',
        observacoes: observacoes?.trim() || null,
      },
    });

    res.status(201).json({
      message: `Empréstimo da chave do armário ${numeroArmarioFinal} registrado para ${aluno.nome}. Prazo de 2 dias.`,
      emprestimo: novoEmprestimo,
    });
  } catch (error) {
    console.error('Error registering key loan:', error);
    res.status(500).json({ error: 'Erro ao registrar empréstimo de chave' });
  }
});

// 6.2. Registrar devolução de chave
app.post('/api/chaves/devolver/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const emprestimo = await prisma.emprestimoChave.findUnique({ where: { id } });
    if (!emprestimo) {
      return res.status(404).json({ error: 'Registro de empréstimo não encontrado' });
    }

    if (emprestimo.status === 'devolvida') {
      return res.status(400).json({ error: 'Esta chave já foi marcada como devolvida anteriormente' });
    }

    const now = new Date();
    const atualizado = await prisma.emprestimoChave.update({
      where: { id },
      data: {
        status: 'devolvida',
        dataDevolucao: now,
        responsavelDevolucao: req.user?.nome || req.user?.email || 'Coordenador',
      },
    });

    res.json({
      message: `Devolução da chave do armário ${atualizado.armarioNumero} registrada com sucesso!`,
      emprestimo: atualizado,
    });
  } catch (error) {
    console.error('Error registering key return:', error);
    res.status(500).json({ error: 'Erro ao registrar devolução de chave' });
  }
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================

async function ensureDefaultAdmin() {
  try {
    // Corrige automaticamente armários marcados como ocupados sem nenhum aluno vinculado
    await prisma.armario.updateMany({
      where: { status: 'ocupado', alunoId: null },
      data: { status: 'livre', dataDistribuicao: null },
    });

    const count = await prisma.usuario.count();
    if (count === 0) {
      await prisma.usuario.create({
        data: {
          nome: 'Coordenador Pedagógico',
          email: 'coordenador@escola.com',
          senha: hashPassword('admin123'),
          role: 'coordenador',
        },
      });
      console.log('✨ Administrador padrão criado: coordenador@escola.com / admin123');
    }
  } catch (err) {
    console.error('Aviso ao inicializar usuário padrão:', err);
  }
}

app.listen(PORT, async () => {
  await ensureDefaultAdmin();
  console.log(`🚀 Servidor Backend rodando na porta http://localhost:${PORT}`);
});
