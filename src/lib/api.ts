const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface UserItem {
  id: string;
  nome: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: UserItem;
}

export interface ArmarioItem {
  id: string;
  numero: string;
  bloco?: string;
  status: 'livre' | 'ocupado' | 'manutencao';
  observacao?: string | null;
  dataDistribuicao?: string | null;
  renovado?: boolean;
  dataRenovacao?: string | null;
  aluno?: string | null;
  turma?: string | null;
  contato?: string | null;
  alunoId?: string | null;
}

export interface RelatoriosHistoricoResponse {
  sorteios: Array<{
    id: string;
    alunoNome: string;
    armario: string;
    turma?: string | null;
    nomeSorteio?: string | null;
    createdAt: string;
  }>;
  movimentacoes: Array<{
    id: string;
    armarioNumero: string;
    alunoNome?: string | null;
    tipo: string;
    armarioAnterior?: string | null;
    responsavelEmail?: string | null;
    detalhes?: string | null;
    createdAt: string;
  }>;
}

export interface ConfiguracaoRenovacao {
  id: string;
  ativa: boolean;
  titulo: string;
  dataInicio?: string | null;
  dataFim?: string | null;
  updatedAt?: string;
}

export interface AlunoItem {
  id: string;
  nome: string;
  matricula: string;
  telefone: string;
  email: string;
  observacao?: string | null;
  turma: string;
  turmaId?: string | null;
  armario?: string | null;
  armarioId?: string | null;
}

export interface TurmaItem {
  id: string;
  nome: string;
  anoLetivo: string;
  curso?: string;
  serie?: string;
  turno?: string;
  totalAlunos: number;
  armariosOcupados: number;
  armariosLivres: number;
}

export interface TurmaDetalhes {
  id: string;
  nome: string;
  anoLetivo: string;
  curso: string;
  serie: string;
  turno: string;
  qtdAlunos: number;
  alunos: Array<{
    id: string;
    nome: string;
    matricula: string;
    telefone: string;
    email: string;
    armario: string | null;
  }>;
}

export interface EmprestimoChaveItem {
  id: string;
  alunoId: string;
  alunoNome: string;
  alunoMatricula?: string | null;
  alunoTurma?: string | null;
  armarioNumero: string;
  dataEmprestimo: string;
  prazoDevolucao: string;
  responsavelEmprestimo: string;
  status: 'pendente' | 'devolvida' | 'atrasada';
  estadoVisual?: 'pendente' | 'devolvida' | 'atrasada';
  dataDevolucao?: string | null;
  responsavelDevolucao?: string | null;
  observacoes?: string | null;
  horasRestantes?: number;
}

export interface AlertasChavesResponse {
  totalPendentes: number;
  atrasadasCount: number;
  proximasCount: number;
  normaisCount: number;
  alertas: EmprestimoChaveItem[];
}

export interface DashboardStats {
  totalArmarios: number;
  armariosDisponiveis: number;
  armariosOcupados: number;
  totalAlunos: number;
}

export interface GrupoSorteio {
  prefixo: string;
  inicio: number | string;
  fim: number | string;
}

function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = sessionStorage.getItem('armarios_token') || localStorage.getItem('armarios_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    sessionStorage.removeItem('armarios_token');
    sessionStorage.removeItem('armarios_user');
    try {
      localStorage.removeItem('armarios_token');
      localStorage.removeItem('armarios_user');
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('auth:unauthorized'));
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Erro na requisição: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // --- AUTENTICAÇÃO ---
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<LoginResponse>(res);
  },

  async getMe(): Promise<UserItem> {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<UserItem>(res);
  },

  async updateProfile(data: {
    nome?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<{ message: string; user: UserItem; token: string }> {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; user: UserItem; token: string }>(res);
  },

  // --- USUÁRIOS DO SISTEMA ---
  async getUsuarios(): Promise<UserItem[]> {
    const res = await fetch(`${API_URL}/usuarios`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<UserItem[]>(res);
  },

  async createUsuario(data: {
    nome: string;
    email: string;
    senha: string;
    role?: string;
  }): Promise<UserItem> {
    const res = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<UserItem>(res);
  },

  async deleteUsuario(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  // --- DASHBOARD ---
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<DashboardStats>(res);
  },

  // --- TURMAS ---
  async getTurmas(): Promise<TurmaItem[]> {
    const res = await fetch(`${API_URL}/turmas`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<TurmaItem[]>(res);
  },

  async createTurma(data: { nome: string; anoLetivo?: string; curso?: string; serie?: string; turno?: string }) {
    const res = await fetch(`${API_URL}/turmas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<TurmaItem>(res);
  },

  async updateTurma(id: string, data: { nome: string; anoLetivo?: string; curso?: string; serie?: string; turno?: string }) {
    const res = await fetch(`${API_URL}/turmas/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<TurmaItem>(res);
  },

  async deleteTurma(id: string) {
    const res = await fetch(`${API_URL}/turmas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async limparTurma(id: string, data: { manterAlunoIds: string[]; acaoRemovidos: 'desvincular' | 'inativar_liberar' }) {
    const res = await fetch(`${API_URL}/turmas/${id}/limpar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; removidos: number; mantidos: number; armariosLiberados: number }>(res);
  },

  warmup() {
    return fetch(`${API_URL}/ping`, { method: 'GET' }).catch(() => {});
  },

  async getTurmaDetalhes(id: string): Promise<TurmaDetalhes> {
    const res = await fetch(`${API_URL}/turmas/${id}/detalhes`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<TurmaDetalhes>(res);
  },

  async desvincularAlunoTurma(turmaId: string, alunoId: string) {
    const res = await fetch(`${API_URL}/turmas/${turmaId}/alunos/${alunoId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async promoverTurmaSeletivo(data: {
    turmaOrigemId: string;
    turmaDestinoId: string;
    alunoIdsSelecionados: string[];
  }) {
    const res = await fetch(`${API_URL}/turmas/promover-seletivo`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; resumo: any }>(res);
  },

  // --- ARMÁRIOS ---
  async getArmarios(): Promise<ArmarioItem[]> {
    const res = await fetch(`${API_URL}/armarios`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ArmarioItem[]>(res);
  },

  async distribuirArmario(armarioId: string, alunoId: string) {
    const res = await fetch(`${API_URL}/armarios/distribuir`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ armarioId, alunoId }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async liberarArmario(armarioId: string) {
    const res = await fetch(`${API_URL}/armarios/liberar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ armarioId }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async trocarArmario(alunoId: string, novoArmarioId: string) {
    const res = await fetch(`${API_URL}/armarios/trocar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ alunoId, novoArmarioId }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async deleteArmario(id: string) {
    const res = await fetch(`${API_URL}/armarios/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async previewExcluirArmariosLote(prefixo: string, inicio: number, fim: number) {
    const res = await fetch(`${API_URL}/armarios/excluir-lote-preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ prefixo, inicio, fim }),
    });
    return handleResponse<{
      prefixo: string;
      inicio: number;
      fim: number;
      totalEncontrados: number;
      livres: number;
      ocupados: number;
      podeExcluirTudo: boolean;
      armarios: Array<{ id: string; numero: string; status: string; aluno: string | null }>;
    }>(res);
  },

  async excluirArmariosLote(prefixo: string, inicio: number, fim: number, apenasLivres = false) {
    const res = await fetch(`${API_URL}/armarios/excluir-lote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ prefixo, inicio, fim, apenasLivres }),
    });
    return handleResponse<{ message: string; excluidosCount: number }>(res);
  },

  async gerarArmariosLote(bloco: string, inicio: number, fim: number) {
    const res = await fetch(`${API_URL}/armarios/gerar-lote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bloco, inicio, fim }),
    });
    return handleResponse<{ message: string; count?: number; totalIntervalo?: number }>(res);
  },

  async updateObservacaoArmario(id: string, observacao: string) {
    const res = await fetch(`${API_URL}/armarios/${id}/observacao`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ observacao }),
    });
    return handleResponse<{ message: string; armario: ArmarioItem }>(res);
  },

  async getRelatoriosHistorico(): Promise<RelatoriosHistoricoResponse> {
    const res = await fetch(`${API_URL}/relatorios/historico`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<RelatoriosHistoricoResponse>(res);
  },

  // --- RENOVAÇÃO DE ARMÁRIOS ---
  async getRenovacaoConfig(): Promise<ConfiguracaoRenovacao> {
    const res = await fetch(`${API_URL}/renovacao`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ConfiguracaoRenovacao>(res);
  },

  async saveRenovacaoConfig(data: {
    ativa: boolean;
    titulo?: string;
    dataInicio?: string;
    dataFim?: string;
    resetarRenovacoes?: boolean;
  }) {
    const res = await fetch(`${API_URL}/renovacao/config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string; config: ConfiguracaoRenovacao }>(res);
  },

  async renovarArmario(id: string) {
    const res = await fetch(`${API_URL}/armarios/${id}/renovar`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; armario: any }>(res);
  },

  async desfazerRenovacaoArmario(id: string) {
    const res = await fetch(`${API_URL}/armarios/${id}/desfazer-renovacao`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; armario: any }>(res);
  },

  async liberarNaoRenovados() {
    const res = await fetch(`${API_URL}/renovacao/liberar-nao-renovados`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; liberados: number }>(res);
  },

  // --- ALUNOS ---
  async getAlunos(turmaId?: string): Promise<AlunoItem[]> {
    const url =
      typeof turmaId === 'string' && turmaId.trim() !== '' && turmaId !== 'todas'
        ? `${API_URL}/alunos?turmaId=${encodeURIComponent(turmaId)}`
        : `${API_URL}/alunos`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse<AlunoItem[]>(res);
  },

  async createAluno(data: { nome: string; matricula: string; telefone?: string; email?: string; turmaId?: string }) {
    const res = await fetch(`${API_URL}/alunos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AlunoItem>(res);
  },

  async importarAlunosLote(data: {
    turmaId?: string;
    atualizarExistentes?: boolean;
    alunos: Array<{
      nome: string;
      matricula: string;
      email?: string;
      telefone?: string;
      turmaNome?: string;
    }>;
  }) {
    const res = await fetch(`${API_URL}/alunos/importar-lote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{
      message: string;
      importados: number;
      atualizados: number;
      ignorados: number;
    }>(res);
  },

  async deleteAluno(id: string) {
    const res = await fetch(`${API_URL}/alunos/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(res);
  },

  async updateAluno(id: string, data: Partial<AlunoItem>) {
    const res = await fetch(`${API_URL}/alunos/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<AlunoItem>(res);
  },

  async updateObservacaoAluno(id: string, observacao: string) {
    const res = await fetch(`${API_URL}/alunos/${id}/observacao`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ observacao }),
    });
    return handleResponse<{ message: string; aluno: AlunoItem }>(res);
  },

  // --- SORTEIO COMBINADO ---
  async previewSorteioMulti(data: {
    grupos: GrupoSorteio[];
    alunoIds?: string[];
    turmaId?: string;
  }) {
    const res = await fetch(`${API_URL}/sorteio/multi-preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{
      totalArmariosLivres: number;
      armariosLivres: Array<{ id: string; numero: string; bloco: string }>;
      totalAlunosParticipantes: number;
      alunos: Array<{ id: string; nome: string; matricula: string; turma: string }>;
      suficiente: boolean;
      diferenca: number;
    }>(res);
  },

  async executarSorteioMulti(data: {
    nomeSorteio?: string;
    grupos: GrupoSorteio[];
    alunoIds: string[];
  }) {
    const res = await fetch(`${API_URL}/sorteio/executar-multi`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{
      message: string;
      resultados: Array<{
        aluno: string;
        matricula: string;
        turma: string;
        armario: string;
        data: string;
      }>;
    }>(res);
  },

  // --- EMPRÉSTIMO DE CHAVES ---
  async getAlertasChaves(): Promise<AlertasChavesResponse> {
    const res = await fetch(`${API_URL}/chaves/alertas`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<AlertasChavesResponse>(res);
  },

  async getEmprestimosChaves(status?: string, search?: string): Promise<EmprestimoChaveItem[]> {
    const params = new URLSearchParams();
    if (status && status !== 'todos') params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`${API_URL}/chaves/listar?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<EmprestimoChaveItem[]>(res);
  },

  async emprestarChave(alunoId: string, observacoes?: string, armarioNumero?: string) {
    const res = await fetch(`${API_URL}/chaves/emprestar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ alunoId, observacoes, armarioNumero }),
    });
    return handleResponse<{ message: string; emprestimo: EmprestimoChaveItem }>(res);
  },

  async devolverChave(id: string) {
    const res = await fetch(`${API_URL}/chaves/devolver/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; emprestimo: EmprestimoChaveItem }>(res);
  },
};
