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
    'PROFISSIONAL': 'Profissional',
    'ENTERPRISE': 'Enterprise',
    // Valores antigos (compatibilidade)
    'trial': 'Trial',
    'basic': 'Básico',
    'pro': 'Pro',
    'enterprise': 'Enterprise'
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
 * Preços por plano
 */
export const planPrices = { 
  'BASICO': 49.90, 
  'PROFISSIONAL': 99.90, 
  'ENTERPRISE': 199.90,
  'basic': 49.90, 
  'pro': 99.90, 
  'enterprise': 199.90 
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
