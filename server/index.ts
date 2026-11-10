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

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors());
app.use(express.json({ limit: '5mb' }));

function requireAdmin(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const role = req.user?.role;
  if (role !== 'coordenador' && role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores ou coordenadores.' });
  }
  next();
}

// --- HEALTHCHECK & CRON PING (Públicos - mantêm API e Banco Neon acordados) ---
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Healthcheck DB error:', error);
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/ping', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'awake', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Cron ping DB error:', error);
    res.status(503).json({ ok: false, db: 'error' });
  }
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

// Atualizar perfil e trocar senha do usuário logado
app.put('/api/auth/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { nome, email, currentPassword, newPassword } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.userId },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Se estiver definindo nova senha, exige a senha atual (exceto no primeiro acesso padrão)
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
      }

      const isContaPadrao = usuario.email === 'coordenador@escola.com';
      if (!isContaPadrao && !currentPassword) {
        return res.status(400).json({ error: 'Informe a senha atual para definir uma nova senha' });
      }

      if (currentPassword) {
        const senhaValida = verifyPassword(currentPassword, usuario.senha);
        if (!senhaValida) {
          return res.status(400).json({ error: 'Senha atual incorreta' });
        }
      }
    }

    // Se alterando e-mail, verificar unicidade
    let emailFinal = usuario.email;
    if (email && typeof email === 'string' && email.toLowerCase().trim() !== usuario.email) {
      const emailLimpo = email.toLowerCase().trim();
      const emailExistente = await prisma.usuario.findUnique({
        where: { email: emailLimpo },
      });
      if (emailExistente && emailExistente.id !== usuario.id) {
        return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário' });
      }
      emailFinal = emailLimpo;
    }

    const dataToUpdate: any = {};
    if (nome && typeof nome === 'string' && nome.trim()) {
      dataToUpdate.nome = nome.trim();
    }
    dataToUpdate.email = emailFinal;
    if (newPassword) {
      dataToUpdate.senha = hashPassword(newPassword);
    }

    const updatedUsuario = await prisma.usuario.update({
      where: { id: req.user.userId },
      data: dataToUpdate,
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });

    const token = createToken({
      userId: updatedUsuario.id,
      email: updatedUsuario.email,
      nome: updatedUsuario.nome,
      role: updatedUsuario.role,
    });

    res.json({
      message: 'Perfil atualizado com sucesso!',
      user: updatedUsuario,
      token,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Erro ao atualizar dados do perfil' });
  }
});

// --- GERENCIAMENTO DE USUÁRIOS (Admin/Coordenador) ---
app.get('/api/usuarios', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(usuarios);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro ao buscar lista de usuários' });
  }
});

app.post('/api/usuarios', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve possuir pelo menos 6 caracteres' });
    }

    const rolesPermitidos = ['coordenador', 'admin', 'atendente'];
    const roleFinal = rolesPermitidos.includes(role) ? role : 'atendente';

    const emailLimpo = email.toLowerCase().trim();
    const jaExiste = await prisma.usuario.findUnique({
      where: { email: emailLimpo },
    });

    if (jaExiste) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail' });
    }

    const novo = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        email: emailLimpo,
        senha: hashPassword(senha),
        role: roleFinal,
      },
      select: { id: true, nome: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json(novo);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.delete('/api/usuarios/:id', authMiddleware, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    if (req.user?.userId === id) {
      return res.status(400).json({ error: 'Você não pode excluir a sua própria conta de acesso' });
    }

    const total = await prisma.usuario.count();
    if (total <= 1) {
      return res.status(400).json({ error: 'Não é possível remover o único usuário do sistema' });
    }

    await prisma.usuario.delete({
      where: { id },
    });

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

// Middleware de proteção para todas as demais rotas da API
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/ping' || req.path === '/auth/login') {
    return next();
  }
  return authMiddleware(req as AuthenticatedRequest, res, next);
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [totalArmarios, armariosLivres, armariosOcupados, totalAlunos] = await Promise.all([
      prisma.armario.count(),
      prisma.armario.count({ where: { status: 'livre' } }),
      prisma.armario.count({ where: { status: 'ocupado' } }),
      prisma.aluno.count({ where: { ativo: true } }),
    ]);

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

// Editar turma existente
app.put('/api/turmas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, anoLetivo, curso, serie, turno } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Nome da turma é obrigatório' });
    }

    const existente = await prisma.turma.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    const duplicada = await prisma.turma.findFirst({
      where: {
        nome: nome.trim(),
        NOT: { id },
      },
    });
    if (duplicada) {
      return res.status(400).json({ error: 'Já existe outra turma cadastrada com este nome' });
    }

    const turmaAtualizada = await prisma.turma.update({
      where: { id },
      data: {
        nome: nome.trim(),
        anoLetivo: anoLetivo?.trim() || existente.anoLetivo,
        curso: curso?.trim() || existente.curso,
        serie: serie?.trim() || existente.serie,
        turno: turno || existente.turno,
      },
    });

    res.json(turmaAtualizada);
  } catch (error: any) {
    console.error('Error updating turma:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Já existe uma turma com este nome' });
    }
    res.status(500).json({ error: 'Erro ao atualizar turma' });
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
      renovado: a.renovado,
      dataRenovacao: a.dataRenovacao,
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
          renovado: false,
          dataRenovacao: null,
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
          renovado: false,
          dataRenovacao: null,
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

    if (end - start > 1000) {
      return res.status(400).json({ error: 'O intervalo máximo permitido por vez é de 1000 armários' });
    }

    const blocoLimpo = String(bloco || '').trim().toUpperCase();
    if (!blocoLimpo) {
      return res.status(400).json({ error: 'Bloco/Prefixo é obrigatório' });
    }

    const dados: { numero: string; bloco: string; status: string }[] = [];
    for (let i = start; i <= end; i++) {
      dados.push({
        numero: `${blocoLimpo}-${i}`,
        bloco: blocoLimpo,
        status: 'livre',
      });
    }

    const result = await prisma.armario.createMany({
      data: dados,
      skipDuplicates: true,
    });

    res.json({
      message:
        result.count > 0
          ? `${result.count} armário(s) criado(s) com sucesso!`
          : `Os armários desse intervalo já estavam cadastrados.`,
      count: result.count,
      totalIntervalo: dados.length,
    });
  } catch (error) {
    console.error('Error batch creating armarios:', error);
    res.status(500).json({ error: 'Erro ao gerar armários em lote' });
  }
});

// ==========================================
// MÓDULO DE RENOVAÇÃO DE ARMÁRIOS
// ==========================================

app.get('/api/renovacao', async (req, res) => {
  try {
    let config = await prisma.configuracaoRenovacao.findUnique({
      where: { id: 'atual' },
    });

    if (!config) {
      config = await prisma.configuracaoRenovacao.create({
        data: {
          id: 'atual',
          ativa: false,
          titulo: 'Renovação de Armários',
        },
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching renovacao config:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de renovação' });
  }
});

app.post('/api/renovacao/config', async (req: AuthenticatedRequest, res) => {
  try {
    const { ativa, titulo, dataInicio, dataFim, resetarRenovacoes } = req.body;

    let inicioDate: Date | null = null;
    let fimDate: Date | null = null;

    if (ativa) {
      if (!dataInicio || !dataFim) {
        return res.status(400).json({ error: 'Informe a data de início e a data de término da renovação.' });
      }
      inicioDate = new Date(`${dataInicio}T00:00:00`);
      fimDate = new Date(`${dataFim}T23:59:59`);

      if (isNaN(inicioDate.getTime()) || isNaN(fimDate.getTime())) {
        return res.status(400).json({ error: 'Datas inválidas.' });
      }
      if (inicioDate > fimDate) {
        return res.status(400).json({ error: 'A data de término não pode ser anterior à data de início.' });
      }
    } else {
      if (dataInicio) inicioDate = new Date(`${dataInicio}T00:00:00`);
      if (dataFim) fimDate = new Date(`${dataFim}T23:59:59`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (ativa && resetarRenovacoes) {
        await tx.armario.updateMany({
          data: {
            renovado: false,
            dataRenovacao: null,
          },
        });
      }

      return tx.configuracaoRenovacao.upsert({
        where: { id: 'atual' },
        update: {
          ativa: Boolean(ativa),
          titulo: titulo?.trim() || 'Renovação de Armários',
          dataInicio: inicioDate,
          dataFim: fimDate,
        },
        create: {
          id: 'atual',
          ativa: Boolean(ativa),
          titulo: titulo?.trim() || 'Renovação de Armários',
          dataInicio: inicioDate,
          dataFim: fimDate,
        },
      });
    });

    res.json({
      message: updated.ativa
        ? 'Campanha de renovação ativada com sucesso!'
        : 'Campanha de renovação encerrada.',
      config: updated,
    });
  } catch (error) {
    console.error('Error saving renovacao config:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração de renovação' });
  }
});

app.post('/api/armarios/:id/renovar', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const armario = await prisma.armario.findUnique({
      where: { id },
      include: { aluno: true },
    });

    if (!armario) {
      return res.status(404).json({ error: 'Armário não encontrado' });
    }
    if (armario.status !== 'ocupado' || !armario.alunoId) {
      return res.status(400).json({ error: 'Apenas armários ocupados podem ser renovados' });
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const arm = await tx.armario.update({
        where: { id },
        data: {
          renovado: true,
          dataRenovacao: now,
        },
      });

      await tx.historicoArmario.create({
        data: {
          armarioNumero: armario.numero,
          alunoId: armario.alunoId,
          alunoNome: armario.aluno?.nome || 'Aluno',
          tipo: 'renovacao',
          responsavelEmail: req.user?.email,
          detalhes: `Armário ${armario.numero} renovado para ${armario.aluno?.nome || 'Aluno'}`,
        },
      });

      return arm;
    });

    res.json({
      message: `Armário ${armario.numero} renovado com sucesso!`,
      armario: updated,
    });
  } catch (error) {
    console.error('Error renewing armario:', error);
    res.status(500).json({ error: 'Erro ao renovar armário' });
  }
});

app.post('/api/armarios/:id/desfazer-renovacao', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const armario = await prisma.armario.findUnique({ where: { id } });

    if (!armario) {
      return res.status(404).json({ error: 'Armário não encontrado' });
    }

    const updated = await prisma.armario.update({
      where: { id },
      data: {
        renovado: false,
        dataRenovacao: null,
      },
    });

    res.json({
      message: `Renovação do armário ${armario.numero} desfeita.`,
      armario: updated,
    });
  } catch (error) {
    console.error('Error undoing armario renewal:', error);
    res.status(500).json({ error: 'Erro ao desfazer renovação do armário' });
  }
});

app.post('/api/renovacao/liberar-nao-renovados', async (req: AuthenticatedRequest, res) => {
  try {
    const naoRenovados = await prisma.armario.findMany({
      where: {
        status: 'ocupado',
        renovado: false,
      },
      include: { aluno: true },
    });

    if (naoRenovados.length === 0) {
      return res.json({ message: 'Não há armários pendentes para liberar.', liberados: 0 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.armario.updateMany({
        where: {
          id: { in: naoRenovados.map((a) => a.id) },
        },
        data: {
          status: 'livre',
          alunoId: null,
          dataDistribuicao: null,
          renovado: false,
          dataRenovacao: null,
        },
      });

      await tx.historicoArmario.createMany({
        data: naoRenovados.map((a) => ({
          armarioNumero: a.numero,
          alunoId: a.alunoId,
          alunoNome: a.aluno?.nome || 'Não identificado',
          tipo: 'liberacao',
          responsavelEmail: req.user?.email,
          detalhes: `Armário liberado por não renovação no prazo (Aluno: ${a.aluno?.nome || 'N/A'})`,
        })),
      });
    });

    res.json({
      message: `${naoRenovados.length} armário(s) não renovado(s) liberado(s) com sucesso!`,
      liberados: naoRenovados.length,
    });
  } catch (error) {
    console.error('Error releasing unrenewed armarios:', error);
    res.status(500).json({ error: 'Erro ao liberar armários não renovados' });
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

// Importação de alunos em lote (.xlsx)
app.post('/api/alunos/importar-lote', async (req, res) => {
  try {
    const { turmaId, alunos, atualizarExistentes } = req.body;

    if (!Array.isArray(alunos) || alunos.length === 0) {
      return res.status(400).json({ error: 'Nenhum aluno válido enviado para importação' });
    }

    let turmaFixaId: string | null = null;
    if (turmaId && turmaId !== 'sem_turma' && turmaId !== 'planilha') {
      const turmaExiste = await prisma.turma.findUnique({ where: { id: turmaId } });
      if (!turmaExiste) {
        return res.status(404).json({ error: 'Turma selecionada não encontrada' });
      }
      turmaFixaId = turmaExiste.id;
    }

    const todasTurmas = turmaFixaId ? [] : await prisma.turma.findMany();
    const mapaTurmasPorNome = new Map(
      todasTurmas.map((t) => [t.nome.trim().toLowerCase(), t.id])
    );

    // Filtra e deduplica por matrícula dentro do próprio arquivo
    const mapaAlunos = new Map<
      string,
      { nome: string; matricula: string; email: string | null; telefone: string | null; turmaId: string | null }
    >();

    for (const item of alunos) {
      const nome = String(item?.nome || '').trim();
      const matricula = String(item?.matricula || '').trim();
      if (!nome || !matricula) continue;

      let resolvedTurmaId = turmaFixaId;
      if (!resolvedTurmaId && turmaId === 'planilha' && item?.turmaNome) {
        resolvedTurmaId = mapaTurmasPorNome.get(String(item.turmaNome).trim().toLowerCase()) || null;
      }

      mapaAlunos.set(matricula, {
        nome,
        matricula,
        email: item?.email ? String(item.email).trim() : null,
        telefone: item?.telefone ? String(item.telefone).trim() : null,
        turmaId: resolvedTurmaId,
      });
    }

    const listaLimpa = Array.from(mapaAlunos.values());
    if (listaLimpa.length === 0) {
      return res.status(400).json({ error: 'Nenhum aluno possui Nome e Matrícula preenchidos' });
    }

    const matriculas = listaLimpa.map((a) => a.matricula);
    const existentes = await prisma.aluno.findMany({
      where: { matricula: { in: matriculas } },
      select: { id: true, matricula: true },
    });
    const existentesSet = new Set(existentes.map((e) => e.matricula));

    const novos = listaLimpa.filter((a) => !existentesSet.has(a.matricula));
    const jaCadastrados = listaLimpa.filter((a) => existentesSet.has(a.matricula));

    let importados = 0;
    let atualizados = 0;
    let ignorados = 0;

    if (novos.length > 0) {
      const created = await prisma.aluno.createMany({
        data: novos.map((a) => ({
          nome: a.nome,
          matricula: a.matricula,
          email: a.email,
          telefone: a.telefone,
          turmaId: a.turmaId,
          ativo: true,
        })),
        skipDuplicates: true,
      });
      importados = created.count;
    }

    if (jaCadastrados.length > 0) {
      if (atualizarExistentes) {
        await prisma.$transaction(
          jaCadastrados.map((a) =>
            prisma.aluno.update({
              where: { matricula: a.matricula },
              data: {
                nome: a.nome,
                ativo: true,
                ...(a.email !== null ? { email: a.email } : {}),
                ...(a.telefone !== null ? { telefone: a.telefone } : {}),
                ...(a.turmaId !== null ? { turmaId: a.turmaId } : {}),
              },
            })
          )
        );
        atualizados = jaCadastrados.length;
      } else {
        ignorados = jaCadastrados.length;
      }
    }

    const partes = [];
    if (importados > 0) partes.push(`${importados} cadastrado(s)`);
    if (atualizados > 0) partes.push(`${atualizados} atualizado(s)`);
    if (ignorados > 0) partes.push(`${ignorados} já existente(s) ignorado(s)`);

    res.json({
      message: partes.length > 0 ? `Importação concluída: ${partes.join(', ')}.` : 'Nenhum aluno alterado.',
      importados,
      atualizados,
      ignorados,
    });
  } catch (error) {
    console.error('Error importing alunos:', error);
    res.status(500).json({ error: 'Erro ao importar alunos em lote' });
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
      const sorteioData = [];
      const historicoData = [];

      for (let i = 0; i < qtdParaSortear; i++) {
        const aluno = alunosParticipantes[i];
        const armario = armariosShuffled[i];

        await tx.armario.update({
          where: { id: armario.id },
          data: {
            status: 'ocupado',
            alunoId: aluno.id,
            dataDistribuicao: now,
            renovado: false,
            dataRenovacao: null,
          },
        });

        sorteioData.push({
          alunoNome: aluno.nome,
          armario: armario.numero,
          turma: aluno.turma?.nome || null,
          nomeSorteio: tituloSorteio,
        });

        historicoData.push({
          armarioNumero: armario.numero,
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          tipo: 'sorteio',
          responsavelEmail: req.user?.email,
          detalhes: `Contemplado no sorteio: ${tituloSorteio}`,
        });

        transResultados.push({
          aluno: aluno.nome,
          matricula: aluno.matricula,
          turma: aluno.turma?.nome || '—',
          armario: armario.numero,
          data: now.toISOString(),
        });
      }

      if (sorteioData.length > 0) {
        await tx.sorteioResultado.createMany({ data: sorteioData });
        await tx.historicoArmario.createMany({ data: historicoData });
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
