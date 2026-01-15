/**
 * Admin Master - Gerenciamento de Tenants (Super Admin)
 * Sistema White Label Multi-Tenant
 */

import { apiUrl } from './configuracao/config.js';
import { 
  getSuperAdminToken, 
  setSuperAdminToken, 
  clearSuperAdminAuth,
  isSuperAdmin 
} from './configuracao/auth.js';

// =====================
// AUTH SUPER ADMIN (usa auth.js centralizado)
// =====================

function isAuthenticated() {
  return !!getSuperAdminToken();
}

/**
 * Fetch com autenticação do Super Admin
 */
async function fetchSuperAdmin(path, options = {}) {
  const url = path.startsWith('http') ? path : apiUrl(path);
  const headers = new Headers(options.headers || {});
  const token = getSuperAdminToken();
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  const resp = await fetch(url, { ...options, headers });
  
  // Se 401/403, mostrar login novamente
  if (resp.status === 401 || resp.status === 403) {
    clearSuperAdminAuth();
    showLoginModal();
    throw new Error('Não autorizado');
  }
  
  return resp;
}

/**
 * Login do Super Admin
 */
async function doSuperAdminLogin(usuario, senha) {
  try {
    // Usar endpoint específico do super admin/master
    let resp = await fetch(apiUrl('/api/auth/login/master'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });
    
    // Se não existir endpoint master, tentar o padrão
    if (resp.status === 404) {
      resp = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });
    }

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        throw new Error('Usuário ou senha incorretos');
      }
      throw new Error(`Erro ${resp.status}`);
    }
    
    const body = await resp.json();
    const token = body.token || body.data?.token;
    
    if (!token) {
      throw new Error('Token não retornado');
    }
    
    // Usar função centralizada do auth.js
    setSuperAdminToken(token);
    return true;
  } catch (err) {
    console.error('[super-admin] Erro no login:', err);
    throw err;
  }
}

function showLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) modal.classList.remove('hidden');
}

function hideLoginModal() {
  const modal = document.getElementById('modal-login');
  if (modal) modal.classList.add('hidden');
}

// Estado da aplicação
const state = {
  tenants: [],
  currentTenant: null,
  searchQuery: ''
};

// =====================
// ELEMENTOS DOM
// =====================
const elements = {
  tenantsTableBody: document.getElementById('tenants-table-body'),
  emptyState: document.getElementById('empty-state'),
  searchInput: document.getElementById('search-tenants'),
  btnNewTenant: document.getElementById('btn-new-tenant'),
  modalNewTenant: document.getElementById('modal-new-tenant'),
  modalTenantDetails: document.getElementById('modal-tenant-details'),
  formNewTenant: document.getElementById('form-new-tenant'),
  // Stats
  statTotal: document.getElementById('stat-total'),
  statActive: document.getElementById('stat-active'),
  statTrial: document.getElementById('stat-trial'),
  statRevenue: document.getElementById('stat-revenue')
};

// =====================
// API FUNCTIONS
// =====================

/**
 * Buscar lista de tenants do backend
 */
async function fetchTenants() {
  try {
    const res = await fetchSuperAdmin('/api/admin/tenants');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data || json || [];
  } catch (err) {
    console.error('[admin-master] Erro ao buscar tenants:', err);
    // Retornar dados mock para desenvolvimento
    return getMockTenants();
  }
}

/**
 * Criar novo tenant
 */
async function createTenant(data) {
  try {
    const res = await fetchSuperAdmin('/api/admin/tenants', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('[admin-master] Erro ao criar tenant:', err);
    // Simular criação para desenvolvimento
    return simulateCreateTenant(data);
  }
}

/**
 * Alternar status do tenant (ativo/inativo)
 */
async function toggleTenantStatus(tenantId) {
  try {
    const res = await fetchSuperAdmin(`/api/admin/tenants/${tenantId}/toggle-status`, {
      method: 'PATCH'
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[admin-master] Erro ao alternar status:', err);
    // Simular para desenvolvimento
    const tenant = state.tenants.find(t => t.id === tenantId);
    if (tenant) {
      tenant.status = tenant.status === 'active' ? 'inactive' : 'active';
    }
    return { success: true };
  }
}

/**
 * Resetar senha do tenant
 */
async function resetTenantPassword(tenantId) {
  try {
    const res = await fetchSuperAdmin(`/api/admin/tenants/${tenantId}/reset-password`, {
      method: 'POST'
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[admin-master] Erro ao resetar senha:', err);
    return { success: true, tempPassword: 'Temp@123' };
  }
}

/**
 * Excluir tenant
 */
async function deleteTenant(tenantId) {
  try {
    const res = await fetchSuperAdmin(`/api/admin/tenants/${tenantId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[admin-master] Erro ao excluir tenant:', err);
    return { success: true };
  }
}

// =====================
// MOCK DATA (Desenvolvimento)
// =====================

function getMockTenants() {
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
      createdAt: '2026-01-05T10:30:00Z',
      config: { primaryColor: '#b5879d', logoUrl: null }
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
      createdAt: '2026-01-08T14:00:00Z',
      config: { primaryColor: '#9c6cba', logoUrl: null }
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
      createdAt: '2026-01-09T09:00:00Z',
      trialEndsAt: '2026-01-23T09:00:00Z',
      config: { primaryColor: '#61b3d7', logoUrl: null }
    }
  ];
}

function simulateCreateTenant(data) {
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
    createdAt: new Date().toISOString(),
    config: { primaryColor: '#b5879d', logoUrl: null }
  };
  
  if (data.plano === 'GRATUITO') {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);
    newTenant.trialEndsAt = trialEnd.toISOString();
  }
  
  state.tenants.push(newTenant);
  return { success: true, data: newTenant };
}

/**
 * Gerar senha aleatória
 */
function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// =====================
// UI FUNCTIONS
// =====================

/**
 * Renderizar tabela de tenants
 */
function renderTenantsTable() {
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
               style="background-color: ${tenant.config?.primaryColor || '#b5879d'}">
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
      <td class="px-6 py-4 text-gray-500 text-sm">${formatDate(tenant.createdAt)}</td>
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
    btn.addEventListener('click', () => openTenantDetails(btn.dataset.id));
  });
}

/**
 * Atualizar estatísticas
 */
function updateStats() {
  const total = state.tenants.length;
  const active = state.tenants.filter(t => {
    const status = (t.status || '').toUpperCase();
    return status === 'ATIVO' || status === 'ACTIVE';
  }).length;
  const trial = state.tenants.filter(t => {
    const status = (t.status || '').toUpperCase();
    return status === 'TRIAL';
  }).length;
  
  // Calcular receita - usando planos em MAIÚSCULAS
  const planPrices = { 
    'BASICO': 49.90, 
    'PROFISSIONAL': 99.90, 
    'ENTERPRISE': 199.90,
    'basic': 49.90, 
    'pro': 99.90, 
    'enterprise': 199.90 
  };
  const revenue = state.tenants
    .filter(t => {
      const status = (t.status || '').toUpperCase();
      return status === 'ATIVO' || status === 'ACTIVE';
    })
    .reduce((sum, t) => sum + (planPrices[t.plano || t.plan] || 0), 0);
  
  elements.statTotal.textContent = total;
  elements.statActive.textContent = active;
  elements.statTrial.textContent = trial;
  elements.statRevenue.textContent = `R$ ${revenue.toFixed(2).replace('.', ',')}`;
}

/**
 * Abrir modal de detalhes do tenant
 */
function openTenantDetails(tenantId) {
  const tenant = state.tenants.find(t => t.id === tenantId);
  if (!tenant) return;
  
  state.currentTenant = tenant;
  
  // Compatibilidade com ambos os formatos
  const nome = tenant.nomeNegocio || tenant.businessName || 'Sem nome';
  const subdominio = tenant.subdominio || tenant.subdomain || '';
  const email = tenant.emailAdmin || tenant.ownerEmail || '';
  const nomeAdmin = tenant.nomeAdmin || '';
  const telefone = tenant.telefoneAdmin || tenant.ownerPhone || '-';
  const plano = tenant.plano || tenant.plan || 'GRATUITO';
  const status = tenant.status || 'ATIVO';
  const dominioCustomizado = tenant.dominioCustomizado || null;
  
  document.getElementById('details-title').textContent = nome;
  
  const content = document.getElementById('details-content');
  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-4">
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Subdomínio</label>
          <p class="text-gray-800 font-medium">${subdominio}.grazybeauty.com.br</p>
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
          <p class="text-gray-800">${formatDate(tenant.createdAt)}</p>
        </div>
        ${tenant.trialEndsAt ? `
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Trial Expira em</label>
          <p class="text-yellow-600 font-medium">${formatDate(tenant.trialEndsAt)}</p>
        </div>
        ` : ''}
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider">Cor Primária</label>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded" style="background-color: ${tenant.config?.primaryColor || '#b5879d'}"></div>
            <span class="text-gray-600 text-sm">${tenant.config?.primaryColor || '#b5879d'}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-6 pt-6 border-t border-gray-100">
      <label class="text-xs text-gray-400 uppercase tracking-wider mb-3 block">Links Rápidos</label>
      <div class="flex flex-wrap gap-3">
        <a href="https://${tenant.subdomain}.grazybeauty.com.br" target="_blank" 
           class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Visitar Site
        </a>
        <a href="https://${tenant.subdomain}.grazybeauty.com.br/painelAdm.html" target="_blank"
           class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
          </svg>
          Painel Admin
        </a>
      </div>
    </div>
  `;
  
  elements.modalTenantDetails.classList.remove('hidden');
}

/**
 * Mostrar toast notification
 */
function showToast(type, title, message) {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  
  const icons = {
    success: `<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>`,
    error: `<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>`,
    info: `<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`
  };
  
  const bgColors = {
    success: 'bg-green-100',
    error: 'bg-red-100',
    info: 'bg-blue-100'
  };
  
  toastIcon.className = `w-10 h-10 rounded-full flex items-center justify-center ${bgColors[type]}`;
  toastIcon.innerHTML = icons[type];
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  
  toast.classList.remove('translate-y-20', 'opacity-0');
  
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 4000);
}

// =====================
// HELPERS
// =====================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPlanLabel(plan) {
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

function getStatusLabel(status) {
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatPhone(value) {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

// =====================
// EVENT HANDLERS
// =====================

function setupEventListeners() {
  // Search
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTenantsTable();
  });
  
  // New Tenant Modal
  elements.btnNewTenant.addEventListener('click', () => {
    elements.modalNewTenant.classList.remove('hidden');
  });
  
  document.querySelectorAll('.btn-new-tenant').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.modalNewTenant.classList.remove('hidden');
    });
  });
  
  // Close modals
  document.getElementById('modal-backdrop').addEventListener('click', () => {
    elements.modalNewTenant.classList.add('hidden');
  });
  
  document.getElementById('modal-close').addEventListener('click', () => {
    elements.modalNewTenant.classList.add('hidden');
  });
  
  document.getElementById('btn-cancel').addEventListener('click', () => {
    elements.modalNewTenant.classList.add('hidden');
  });
  
  document.getElementById('modal-details-backdrop').addEventListener('click', () => {
    elements.modalTenantDetails.classList.add('hidden');
  });
  
  document.getElementById('modal-details-close').addEventListener('click', () => {
    elements.modalTenantDetails.classList.add('hidden');
  });
  
  // Phone mask
  const phoneInput = elements.formNewTenant.querySelector('[name="telefoneAdmin"]');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  }
  
  // Subdomain validation
  const subdomainInput = elements.formNewTenant.querySelector('[name="subdominio"]');
  if (subdomainInput) {
    subdomainInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    });
  }
  
  // Gerar senha aleatória
  const btnGerarSenha = document.getElementById('btn-gerar-senha');
  if (btnGerarSenha) {
    btnGerarSenha.addEventListener('click', () => {
      const senhaInput = document.getElementById('senha-provisoria');
      if (senhaInput) {
        senhaInput.value = generatePassword(10);
      }
    });
  }
  
  // Form submit
  elements.formNewTenant.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Remover campos vazios opcionais
    if (!data.dominioCustomizado) delete data.dominioCustomizado;
    if (!data.senhaProvisoria) delete data.senhaProvisoria;
    if (!data.telefoneAdmin) delete data.telefoneAdmin;
    
    // Remover checkbox do payload (não faz parte do DTO do backend)
    delete data.sendWelcomeEmail;
    
    // Show loading
    document.getElementById('btn-submit-text').textContent = 'Criando...';
    document.getElementById('btn-submit-spinner').classList.remove('hidden');
    
    try {
      const result = await createTenant(data);
      
      if (result.success || result.data) {
        showToast('success', 'Tenant Criado!', `${data.nomeNegocio} foi provisionado com sucesso.`);
        elements.modalNewTenant.classList.add('hidden');
        elements.formNewTenant.reset();
        
        // Refresh data
        await loadTenants();
      } else {
        throw new Error(result.message || 'Erro ao criar tenant');
      }
    } catch (err) {
      showToast('error', 'Erro', err.message);
    } finally {
      document.getElementById('btn-submit-text').textContent = 'Criar Tenant';
      document.getElementById('btn-submit-spinner').classList.add('hidden');
    }
  });
  
  // Tenant actions
  document.getElementById('btn-toggle-status').addEventListener('click', async () => {
    if (!state.currentTenant) return;
    
    await toggleTenantStatus(state.currentTenant.id);
    showToast('success', 'Status Alterado', 'O status do tenant foi atualizado.');
    elements.modalTenantDetails.classList.add('hidden');
    await loadTenants();
  });
  
  document.getElementById('btn-reset-password').addEventListener('click', async () => {
    if (!state.currentTenant) return;
    
    if (!confirm('Deseja realmente resetar a senha deste tenant?')) return;
    
    const result = await resetTenantPassword(state.currentTenant.id);
    showToast('info', 'Senha Resetada', `Nova senha temporária: ${result.tempPassword || 'Enviada por email'}`);
  });
  
  document.getElementById('btn-delete-tenant').addEventListener('click', async () => {
    if (!state.currentTenant) return;
    
    if (!confirm(`ATENÇÃO: Esta ação é irreversível!\n\nDeseja realmente excluir o tenant "${state.currentTenant.businessName}"?\n\nTodos os dados serão perdidos.`)) return;
    
    await deleteTenant(state.currentTenant.id);
    state.tenants = state.tenants.filter(t => t.id !== state.currentTenant.id);
    showToast('success', 'Tenant Excluído', 'O tenant foi removido com sucesso.');
    elements.modalTenantDetails.classList.add('hidden');
    renderTenantsTable();
    updateStats();
  });
  
  // Logout - usa função centralizada do auth.js
  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('Deseja sair do painel?')) {
      clearSuperAdminAuth();
      showLoginModal();
    }
  });
  
  // Login Form
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userInput = document.getElementById('login-user');
      const passInput = document.getElementById('login-password');
      const errorDiv = document.getElementById('login-error');
      const submitBtn = formLogin.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      try {
        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';
        
        await doSuperAdminLogin(userInput.value, passInput.value);
        
        hideLoginModal();
        await loadTenants();
        showToast('success', 'Bem-vindo!', 'Login realizado com sucesso');
      } catch (err) {
        errorDiv.textContent = err.message || 'Erro ao fazer login';
        errorDiv.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}

// =====================
// INIT
// =====================

async function loadTenants() {
  state.tenants = await fetchTenants();
  renderTenantsTable();
  updateStats();
}

async function init() {
  console.log('[admin-master] Inicializando Super Admin...');
  
  setupEventListeners();
  
  // Verificar se está autenticado
  if (!isAuthenticated()) {
    showLoginModal();
    return;
  }
  
  // Se já autenticado, esconder modal e carregar dados
  hideLoginModal();
  await loadTenants();
  
  console.log('[admin-master] Super Admin carregado com sucesso');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
