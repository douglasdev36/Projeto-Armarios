import { PrismaClient } from '@prisma/client';
import { hashPassword } from './auth.ts';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando banco de dados PostgreSQL com dados iniciais...');

  // Limpar tabelas existentes em ordem
  await prisma.sorteioResultado.deleteMany({});
  await prisma.armario.deleteMany({});
  await prisma.aluno.deleteMany({});
  await prisma.turma.deleteMany({});
  await prisma.usuario.deleteMany({});

  // Criar Usuário Coordenador Padrão
  const usuarioAdmin = await prisma.usuario.create({
    data: {
      nome: 'Coordenador Pedagógico',
      email: 'coordenador@escola.com',
      senha: hashPassword('admin123'),
      role: 'coordenador',
    },
  });
  console.log('👤 Usuário coordenador criado:', usuarioAdmin.email, '(senha: admin123)');

  // Criar Turmas
  const turma9A = await prisma.turma.create({
    data: { nome: '9º A', anoLetivo: '2024' },
  });
  const turma9B = await prisma.turma.create({
    data: { nome: '9º B', anoLetivo: '2024' },
  });
  const turma8C = await prisma.turma.create({
    data: { nome: '8º C', anoLetivo: '2024' },
  });
  const turma7A = await prisma.turma.create({
    data: { nome: '7º A', anoLetivo: '2024' },
  });

  // Criar Armários em lote (Blocos A, B e C)
  const armariosData = [
    { numero: 'A-1', bloco: 'A', status: 'ocupado' },
    { numero: 'A-2', bloco: 'A', status: 'livre' },
    { numero: 'A-3', bloco: 'A', status: 'ocupado' },
    { numero: 'A-4', bloco: 'A', status: 'ocupado' },
    { numero: 'A-5', bloco: 'A', status: 'livre' },
    { numero: 'A-6', bloco: 'A', status: 'livre' },
    { numero: 'B-1', bloco: 'B', status: 'livre' },
    { numero: 'B-2', bloco: 'B', status: 'ocupado' },
    { numero: 'B-3', bloco: 'B', status: 'livre' },
    { numero: 'C-1', bloco: 'C', status: 'ocupado' },
    { numero: 'C-2', bloco: 'C', status: 'livre' },
  ];

  const armariosCriados: Record<string, string> = {};
  for (const a of armariosData) {
    const created = await prisma.armario.create({
      data: { numero: a.numero, bloco: a.bloco, status: a.status },
    });
    armariosCriados[a.numero] = created.id;
  }

  // Criar Alunos vinculados a turmas e armários
  const alunosData = [
    { nome: 'Carlos Pereira', matricula: '2024001', telefone: '(11) 98765-4321', email: 'carlos.pereira@email.com', turmaId: turma9A.id, armarioNumero: 'A-1' },
    { nome: 'Beatriz Lima', matricula: '2024002', telefone: '(11) 91234-5678', email: 'beatriz.lima@email.com', turmaId: turma8C.id, armarioNumero: 'A-3' },
    { nome: 'Daniel Costa', matricula: '2024003', telefone: '(21) 99999-8888', email: 'daniel.costa@email.com', turmaId: turma9B.id, armarioNumero: 'A-4' },
    { nome: 'Fernanda Santos', matricula: '2024004', telefone: '(11) 97777-6666', email: 'fernanda.santos@email.com', turmaId: turma7A.id, armarioNumero: 'B-2' },
    { nome: 'Marina Santos', matricula: '2024005', telefone: '(21) 98888-1111', email: 'marina.santos@email.com', turmaId: turma7A.id, armarioNumero: 'C-1' },
    { nome: 'Lucas Oliveira', matricula: '2024006', telefone: '(31) 95555-8888', email: 'lucas.oliveira@email.com', turmaId: turma9A.id },
  ];

  for (const a of alunosData) {
    const alunoCriado = await prisma.aluno.create({
      data: {
        nome: a.nome,
        matricula: a.matricula,
        telefone: a.telefone,
        email: a.email,
        turma: a.turmaId ? { connect: { id: a.turmaId } } : undefined,
      },
    });

    if (a.armarioNumero && armariosCriados[a.armarioNumero]) {
      await prisma.armario.update({
        where: { id: armariosCriados[a.armarioNumero] },
        data: {
          status: 'ocupado',
          aluno: { connect: { id: alunoCriado.id } },
        },
      });
    }
  }

  console.log('✅ Banco de dados PostgreSQL inicializado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
