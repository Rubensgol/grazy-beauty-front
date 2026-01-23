/**
 * Admin Master - Dados Mock
 * Dados simulados para desenvolvimento
 */

// Referência ao estado global (será passado pelas funções)
let _state = null;

export function setMockState(state) {
  _state = state;
}

/**
 * Retorna dados mock de tenants para desenvolvimento
 */
export function getMockTenants() {
  return [
    {
      id: '1',
      nomeNegocio: 'Barbearia do João',
      subdominio: 'joao',
      emailAdmin: 'joao@email.com',
      nomeAdmin: 'João Silva',
      telefoneAdmin: '(21) 99999-1111',
      plano: 'BASICO',
      status: 'ATIVO',
      criadoEm: '2026-01-05T10:30:00Z',
      onboardingCompleto: true,
      agendamentosNoMes: 35,
      limiteAgendamentosMes: 50,
      corPrimaria: '#b5879d'
    },
    {
      id: '2',
      nomeNegocio: 'Studio Maria Beleza',
      subdominio: 'mariabeleza',
      emailAdmin: 'maria@studio.com',
      nomeAdmin: 'Maria Santos',
      telefoneAdmin: '(21) 99999-2222',
      plano: 'PROFISSIONAL',
      status: 'ATIVO',
      criadoEm: '2026-01-08T14:00:00Z',
      onboardingCompleto: true,
      agendamentosNoMes: 78,
      limiteAgendamentosMes: 200,
      corPrimaria: '#9c6cba'
    },
    {
      id: '3',
      nomeNegocio: 'Espaço Zen Estética',
      subdominio: 'espacozen',
      emailAdmin: 'contato@espacozen.com',
      nomeAdmin: 'Ana Costa',
      telefoneAdmin: '(21) 99999-3333',
      plano: 'GRATUITO',
      status: 'TRIAL',
      criadoEm: '2026-01-09T09:00:00Z',
      onboardingCompleto: false,
      agendamentosNoMes: 5,
      limiteAgendamentosMes: 30,
      corPrimaria: '#61b3d7'
    }
  ];
}

/**
 * Simula criação de tenant para desenvolvimento
 */
export function simulateCreateTenant(data, state = _state) {
  const newTenant = {
    id: String(Date.now()),
    nomeNegocio: data.nomeNegocio,
    subdominio: data.subdominio,
    emailAdmin: data.emailAdmin,
    nomeAdmin: data.nomeAdmin,
    telefoneAdmin: data.telefoneAdmin || '',
    plano: data.plano,
    dominioCustomizado: data.dominioCustomizado || null,
    status: data.plano === 'GRATUITO' ? 'TRIAL' : 'ATIVO',
    criadoEm: new Date().toISOString(),
    onboardingCompleto: false,
    agendamentosNoMes: 0,
    limiteAgendamentosMes: getLimiteAgendamentos(data.plano),
    corPrimaria: '#b5879d'
  };
  
  if (state) {
    state.tenants.push(newTenant);
  }
  
  return { success: true, data: newTenant };
}

/**
 * Retorna o limite de agendamentos por plano
 */
function getLimiteAgendamentos(plano) {
  const limites = {
    'GRATUITO': 30,
    'BASICO': 50,
    'PROFISSIONAL': 200,
    'ENTERPRISE': 500
  };
  return limites[plano] || 30;
}
