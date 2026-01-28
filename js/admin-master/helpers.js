/**
 * Admin Master - Funções Auxiliares
 * Utilitários e helpers
 */

/**
 * Escape HTML para prevenir XSS
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Retorna label formatado para o plano
 */
export function getPlanLabel(plan) {
  const labels = {
    // Novos valores (backend)
    'GRATUITO': 'Gratuito',
    'BASICO': 'Básico',
    'INTERMEDIARIO': 'Intermediário',
    'PROFISSIONAL': 'Profissional',
    // Valores antigos (compatibilidade)
    'ENTERPRISE': 'Profissional',
    'trial': 'Trial',
    'basic': 'Básico',
    'pro': 'Profissional',
    'enterprise': 'Profissional'
  };
  return labels[plan] || plan;
}

/**
 * Retorna label formatado para o status
 */
export function getStatusLabel(status) {
  const labels = {
    // Novos valores (backend)
    'ATIVO': 'Ativo',
    'INATIVO': 'Inativo',
    'TRIAL': 'Trial',
    'SUSPENSO': 'Suspenso',
    // Valores antigos (compatibilidade)
    'active': 'Ativo',
    'inactive': 'Inativo',
    'trial': 'Trial'
  };
  return labels[status] || status;
}

/**
 * Formata data para exibição (dd/mm/yyyy)
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata data e hora para exibição
 */
export function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata número de telefone
 */
export function formatPhone(value) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Gerar senha aleatória
 */
export function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Preços por plano (em reais)
 */
export const planPrices = { 
  'GRATUITO': 0,
  'BASICO': 40.00, 
  'INTERMEDIARIO': 50.00,
  'PROFISSIONAL': 70.00,
  // Compatibilidade
  'ENTERPRISE': 70.00,
  'basic': 40.00, 
  'pro': 70.00, 
  'enterprise': 70.00 
};

/**
 * Dias de trial por plano
 */
export const planTrialDays = {
  'GRATUITO': 5,
  'BASICO': 0,
  'INTERMEDIARIO': 0,
  'PROFISSIONAL': 0
};

/**
 * Recursos por plano
 */
export const planFeatures = {
  'GRATUITO': ['Painel Administrativo', '5 dias de teste'],
  'BASICO': ['Painel Administrativo', 'Agenda ilimitada', 'Gestão de clientes'],
  'INTERMEDIARIO': ['Painel Administrativo', 'Landing Page personalizada', 'Agenda ilimitada', 'Gestão de clientes'],
  'PROFISSIONAL': ['Painel Administrativo', 'Landing Page personalizada', 'Domínio próprio', 'Agenda ilimitada', 'Gestão de clientes', 'Suporte prioritário']
};

/**
 * Verifica se status é ativo
 */
export function isActiveStatus(status) {
  const s = (status || '').toUpperCase();
  return s === 'ATIVO' || s === 'ACTIVE';
}

/**
 * Verifica se status é trial
 */
export function isTrialStatus(status) {
  const s = (status || '').toUpperCase();
  return s === 'TRIAL';
}
