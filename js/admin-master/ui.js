/**
 * Admin Master - Módulo de UI
 * Funções de renderização e interface
 */

import { 
  escapeHtml, 
  getPlanLabel, 
  getStatusLabel, 
  formatDate, 
  formatDateTime,
  planPrices,
  isActiveStatus,
  isTrialStatus
} from './helpers.js';

// Função de fetch injetada externamente (evita dependência circular)
let _fetchTenantDetailsFn = null;

export function setFetchTenantDetailsFn(fn) {
  _fetchTenantDetailsFn = fn;
}

// =====================
// ELEMENTOS DOM
// =====================
export const elements = {
  tenantsTableBody: null,
  emptyState: null,
  searchInput: null,
  btnNewTenant: null,
  modalNewTenant: null,
  modalTenantDetails: null,
  formNewTenant: null,
  // Stats
  statTotal: null,
  statActive: null,
  statTrial: null,
  statRevenue: null
};

/**
 * Inicializa as referências aos elementos DOM
 */
export function initElements() {
  elements.tenantsTableBody = document.getElementById('tenants-table-body');
  elements.emptyState = document.getElementById('empty-state');
  elements.searchInput = document.getElementById('search-tenants');
  elements.btnNewTenant = document.getElementById('btn-new-tenant');
  elements.modalNewTenant = document.getElementById('modal-new-tenant');
  elements.modalTenantDetails = document.getElementById('modal-tenant-details');
  elements.formNewTenant = document.getElementById('form-new-tenant');
  elements.statTotal = document.getElementById('stat-total');
  elements.statActive = document.getElementById('stat-active');
  elements.statTrial = document.getElementById('stat-trial');
  elements.statRevenue = document.getElementById('stat-revenue');
}

// =====================
// MODAIS
// =====================

export function showLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) modal.classList.remove('hidden');
}

export function hideLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) modal.classList.add('hidden');
}

export function showNewTenantModal() {
  if (elements.modalNewTenant) {
    elements.modalNewTenant.classList.remove('hidden');
  }
}

export function hideNewTenantModal() {
  if (elements.modalNewTenant) {
    elements.modalNewTenant.classList.add('hidden');
  }
}

export function showTenantDetailsModal() {
  if (elements.modalTenantDetails) {
    elements.modalTenantDetails.classList.remove('hidden');
  }
}

export function hideTenantDetailsModal() {
  if (elements.modalTenantDetails) {
    elements.modalTenantDetails.classList.add('hidden');
  }
}

// =====================
// RENDERIZAÇÃO
// =====================

/**
 * Renderizar tabela de tenants
 */
export function renderTenantsTable(state, onViewTenant) {
  if (!elements.tenantsTableBody || !elements.emptyState) return;
  
  const filtered = state.tenants.filter(t => {
    if (!state.searchQuery) return true;
    const q = state.searchQuery.toLowerCase();
    return (t.nomeNegocio || t.businessName || '').toLowerCase().includes(q) ||
           (t.subdominio || t.subdomain || '').toLowerCase().includes(q) ||
           (t.emailAdmin || t.ownerEmail || '').toLowerCase().includes(q);
  });
  
  if (filtered.length === 0) {
    elements.tenantsTableBody.innerHTML = '';
    elements.emptyState.classList.remove('hidden');
    return;
  }
  
  elements.emptyState.classList.add('hidden');
  
  elements.tenantsTableBody.innerHTML = filtered.map(tenant => {
    // Compatibilidade com ambos os formatos de dados
    const nome = tenant.nomeNegocio || tenant.businessName || 'Sem nome';
    const subdominio = tenant.subdominio || tenant.subdomain || '';
    const email = tenant.emailAdmin || tenant.ownerEmail || '';
    const telefone = tenant.telefoneAdmin || tenant.ownerPhone || '-';
    const plano = tenant.plano || tenant.plan || 'GRATUITO';
    const status = tenant.status || 'ATIVO';
    
    return `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" 
               style="background-color: ${tenant.corPrimaria || tenant.config?.primaryColor || '#b5879d'}">
            ${nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p class="font-semibold text-gray-800">${escapeHtml(nome)}</p>
            <p class="text-xs text-gray-400">${telefone}</p>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">
        <a href="https://${subdominio}.grazybeauty.com.br" target="_blank" 
           class="text-indigo-600 hover:text-indigo-800 font-medium">
          ${subdominio}.grazybeauty.com.br
        </a>
      </td>
      <td class="px-6 py-4 text-gray-600">${escapeHtml(email)}</td>
      <td class="px-6 py-4">
        <span class="plan-badge plan-${plano.toLowerCase()}">${getPlanLabel(plano)}</span>
      </td>
      <td class="px-6 py-4">
        <span class="status-badge status-${status.toLowerCase()}">${getStatusLabel(status)}</span>
      </td>
      <td class="px-6 py-4 text-gray-500 text-sm">${formatDate(tenant.criadoEm || tenant.createdAt)}</td>
      <td class="px-6 py-4 text-right">
        <button class="text-gray-400 hover:text-indigo-600 transition-colors btn-view-tenant" data-id="${tenant.id}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </td>
    </tr>
  `}).join('');
  
  // Add click handlers
  document.querySelectorAll('.btn-view-tenant').forEach(btn => {
    btn.addEventListener('click', () => onViewTenant(btn.dataset.id));
  });
}

/**
 * Atualizar estatísticas
 */
export function updateStats(state) {
  if (!elements.statTotal) return;
  
  const total = state.tenants.length;
  const active = state.tenants.filter(t => isActiveStatus(t.status)).length;
  const trial = state.tenants.filter(t => isTrialStatus(t.status)).length;
  
  // Calcular receita
  const revenue = state.tenants
    .filter(t => isActiveStatus(t.status))
    .reduce((sum, t) => sum + (planPrices[t.plano || t.plan] || 0), 0);
  
  elements.statTotal.textContent = total;
  elements.statActive.textContent = active;
  elements.statTrial.textContent = trial;
  elements.statRevenue.textContent = `R$ ${revenue.toFixed(2).replace('.', ',')}`;
}

/**
 * Abrir modal de detalhes do tenant
 */
export async function openTenantDetails(tenantId, state) {
  // Mostrar loading no modal
  const content = document.getElementById('details-content');
  if (!content) return;
  
  content.innerHTML = '<div class="text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div><p class="text-gray-500 mt-2">Carregando...</p></div>';
  showTenantDetailsModal();
  
  // Buscar detalhes completos via API
  if (!_fetchTenantDetailsFn) {
    content.innerHTML = '<p class="text-red-500 text-center py-8">Função de fetch não configurada</p>';
    return null;
  }
  
  const tenant = await _fetchTenantDetailsFn(tenantId, state);
  if (!tenant) {
    content.innerHTML = '<p class="text-red-500 text-center py-8">Erro ao carregar detalhes do tenant</p>';
    return null;
  }
  
  state.currentTenant = tenant;
  
  // Renderizar detalhes
  renderTenantDetails(tenant);
  
  return tenant;
}

/**
 * Renderizar detalhes do tenant no modal
 */
function renderTenantDetails(tenant) {
  const content = document.getElementById('details-content');
  const titleEl = document.getElementById('details-title');
  
  // Compatibilidade com ambos os formatos
  const nome = tenant.nomeNegocio || tenant.businessName || 'Sem nome';
  const subdominio = tenant.subdominio || tenant.subdomain || '';
  const email = tenant.emailAdmin || tenant.ownerEmail || '';
  const nomeAdmin = tenant.nomeAdmin || '';
  const telefone = tenant.telefoneAdmin || tenant.ownerPhone || '-';
  const plano = tenant.plano || tenant.plan || 'GRATUITO';
  const status = tenant.status || 'ATIVO';
  const dominioCustomizado = tenant.dominioCustomizado || null;
  
  if (titleEl) {
    titleEl.textContent = nome;
  }
  
  // Dados de uso e métricas
  const agendamentosNoMes = tenant.agendamentosNoMes || 0;
  const limiteAgendamentos = tenant.limiteAgendamentosMes || 50;
  const percentUso = Math.min(100, Math.round((agendamentosNoMes / limiteAgendamentos) * 100));
  const onboardingCompleto = tenant.onboardingCompleto || false;
  const corPrimaria = tenant.corPrimaria || '#b5879d';
  
  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Subdomínio</label>
          <p class="text-gray-800 font-medium">
            <a href="https://${subdominio}.grazybeauty.com.br" target="_blank" class="text-indigo-600 hover:text-indigo-800">
              ${subdominio}.grazybeauty.com.br
            </a>
          </p>
        </div>
        ${dominioCustomizado ? `
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Domínio Customizado</label>
          <p class="text-gray-800 font-medium">${dominioCustomizado}</p>
        </div>
        ` : ''}
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Administrador</label>
          <p class="text-gray-800">${escapeHtml(nomeAdmin || '-')}</p>
        </div>
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Email</label>
          <p class="text-gray-800">${escapeHtml(email)}</p>
        </div>
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Telefone</label>
          <p class="text-gray-800">${telefone}</p>
        </div>
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Plano</label>
          <p><span class="plan-badge plan-${plano.toLowerCase()}">${getPlanLabel(plano)}</span></p>
        </div>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Status</label>
          <p><span class="status-badge status-${status.toLowerCase()}">${getStatusLabel(status)}</span></p>
        </div>
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Criado em</label>
          <p class="text-gray-800">${formatDateTime(tenant.criadoEm || tenant.createdAt)}</p>
        </div>
        ${tenant.atualizadoEm ? `
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Última Atualização</label>
          <p class="text-gray-600 text-sm">${formatDateTime(tenant.atualizadoEm)}</p>
        </div>
        ` : ''}
        ${tenant.suspensaoEm ? `
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Suspenso em</label>
          <p class="text-red-600 font-medium">${formatDateTime(tenant.suspensaoEm)}</p>
          ${tenant.motivoSuspensao ? `<p class="text-red-500 text-xs mt-1">${escapeHtml(tenant.motivoSuspensao)}</p>` : ''}
        </div>
        ` : ''}
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Onboarding</label>
          <p class="flex items-center gap-2">
            ${onboardingCompleto 
              ? '<span class="text-green-600 flex items-center gap-1"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg> Completo</span>'
              : '<span class="text-yellow-600 flex items-center gap-1"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg> Pendente</span>'
            }
          </p>
        </div>
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Cor Primária</label>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded border" style="background-color: ${corPrimaria}"></div>
            <span class="text-gray-600 text-sm">${corPrimaria}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Métricas de Uso -->
    <div class="mt-6 pt-6 border-t border-gray-100">
      <label class="text-xs text-gray-400 uppercase tracking-wider mb-3 block">Uso do Plano</label>
      <div class="bg-gray-50 rounded-xl p-4">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-gray-600">Agendamentos no Mês</span>
          <span class="font-semibold ${percentUso >= 90 ? 'text-red-600' : percentUso >= 70 ? 'text-yellow-600' : 'text-green-600'}">${agendamentosNoMes} / ${limiteAgendamentos}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="h-2 rounded-full transition-all ${percentUso >= 90 ? 'bg-red-500' : percentUso >= 70 ? 'bg-yellow-500' : 'bg-green-500'}" style="width: ${percentUso}%"></div>
        </div>
        <p class="text-xs text-gray-400 mt-1">${percentUso}% utilizado</p>
      </div>
    </div>
    
    <!-- Links Rápidos -->
    <div class="mt-6 pt-6 border-t border-gray-100">
      <label class="text-xs text-gray-400 uppercase tracking-wider mb-3 block">Links Rápidos</label>
      <div class="flex flex-wrap gap-3">
        <a href="https://${subdominio}.grazybeauty.com.br" target="_blank" 
           class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Visitar Site
        </a>
        <a href="https://${subdominio}.grazybeauty.com.br/painelAdm.html" target="_blank"
           class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          </svg>
          Painel Admin
        </a>
        <a href="https://${subdominio}.grazybeauty.com.br/login.html" target="_blank"
           class="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login
        </a>
      </div>
    </div>
  `;
}

/**
 * Atualizar texto e spinner do botão de submit
 */
export function setSubmitLoading(loading) {
  const textEl = document.getElementById('btn-submit-text');
  const spinnerEl = document.getElementById('btn-submit-spinner');
  
  if (textEl) {
    textEl.textContent = loading ? 'Criando...' : 'Criar Tenant';
  }
  if (spinnerEl) {
    spinnerEl.classList.toggle('hidden', !loading);
  }
}
