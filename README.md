# 🏫 Sistema de Gerenciamento de Armários Escolares

Sistema Full Stack completo para gestão, controle e sorteio de armários escolares, cadastro de turmas, alunos e histórico de empréstimo de chaves.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons
- **Backend:** Node.js, Express, Prisma ORM, JWT, BcryptJS
- **Banco de Dados:** PostgreSQL

---

## 🚀 Como Rodar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/douglasdev36/Projeto-Armarios.git
cd Projeto-Armarios
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz com base no `.env.example`:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/armarios_db?schema=public"
PORT=3001
VITE_API_URL="http://localhost:3001/api"
```

### 4. Iniciar o banco de dados (Docker)
```bash
docker compose up -d
```

### 5. Executar migrações do banco
```bash
npm run db:push
npm run db:seed
```

### 6. Iniciar os servidores
- **Backend:** `npm run server` (rodando em `http://localhost:3001`)
- **Frontend:** `npm run dev` (rodando em `http://localhost:8081`)

---

## ☁️ Guia de Deploy Gratuito (Neon + Render + Vercel)

Você pode hospedar este projeto sem custos usando o mesmo repositório:

### 1. Banco de Dados — Neon (PostgreSQL)
1. Acesse [neon.tech](https://neon.tech) e crie um projeto gratuito.
2. Copie a **Connection String** gerada (ex: `postgresql://usuario:senha@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`).

### 2. Backend — Render (Web Service)
1. Acesse [render.com](https://render.com) e clique em **New + > Web Service**.
2. Conecte o repositório `Projeto-Armarios`.
3. Configure:
   - **Environment:** `Node`
   - **Build Command:** `npm run render:build`
   - **Start Command:** `npm start`
4. Em **Environment Variables**:
   - `DATABASE_URL`: *Cole a URL do Neon*
   - `PORT`: `10000`
5. Clique em **Create Web Service** e copie a URL gerada (ex: `https://api-armarios.onrender.com`).

### 3. Frontend — Vercel
1. Acesse [vercel.com](https://vercel.com) e importe o repositório `Projeto-Armarios`.
2. Em **Framework Preset**, selecione **Vite**.
3. Em **Environment Variables**:
   - `VITE_API_URL`: `https://sua-api.onrender.com/api` *(URL gerada pelo Render com `/api` no final)*
4. Clique em **Deploy**.

---

## 🔐 Acesso Padrão Inicial
- **E-mail:** `coordenador@escola.com`
- **Senha:** `admin123`
