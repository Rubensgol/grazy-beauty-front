/**
 * Admin Master - Gerenciamento de Tenants (Super Admin)
 * Sistema White Label Multi-Tenant
 * 
 * Arquivo principal - coordena os módulos
 */

import { getSuperAdminToken } from './configuracao/auth.js';
import { fetchTenants, fetchTenantDetails, setOnUnauthorizedCallback } from './admin-master/api.js';
import { setMockState } from './admin-master/mock.js';
import { 
  initElements, 
  showLoginModal, 
  hideLoginModal,
  renderTenantsTable, 
  updateStats,
  openTenantDetails,
  setFetchTenantDetailsFn
} from './admin-master/ui.js';
import { setupEventListeners } from './admin-master/events.js';

// =====================
// ESTADO DA APLICAÇÃO
// =====================
const state = {
  tenants: [],
  currentTenant: null,
  searchQuery: ''
};

// Compartilhar estado com módulo de mock
setMockState(state);

// Configurar callback para quando não autorizado
setOnUnauthorizedCallback(() => showLoginModal());

// Injetar função de fetch no módulo de UI (evita dependência circular)
setFetchTenantDetailsFn(fetchTenantDetails);

// =====================
// AUTH
// =====================
function isAuthenticated() {
  return !!getSuperAdminToken();
}

// =====================
// CARREGAMENTO DE DADOS
// =====================
async function loadTenants() {
  state.tenants = await fetchTenants();
  renderTenantsTable(state, (id) => openTenantDetails(id, state));
  updateStats(state);
}

// =====================
// INICIALIZAÇÃO
// =====================
async function init() {
  console.log('[admin-master] Inicializando Super Admin...');
  
  // Inicializar referências DOM
  initElements();
  
  // Configurar eventos
  setupEventListeners(state, loadTenants);
  
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

// =====================
// START
// =====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Exportar para uso externo se necessário
export { state, loadTenants };
