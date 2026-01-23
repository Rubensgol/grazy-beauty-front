/**
 * Admin Master - Módulo Index
 * Re-exporta todos os módulos para facilitar importações
 */

// API
export { 
  fetchSuperAdmin,
  fetchTenants, 
  createTenant, 
  toggleTenantStatus, 
  resetTenantPassword, 
  deleteTenant,
  fetchTenantDetails,
  setOnUnauthorizedCallback
} from './api.js';

// Mock Data
export { getMockTenants, simulateCreateTenant, setMockState } from './mock.js';

// Helpers
export { 
  escapeHtml, 
  getPlanLabel, 
  getStatusLabel, 
  formatDate, 
  formatDateTime, 
  formatPhone,
  generatePassword,
  planPrices,
  isActiveStatus,
  isTrialStatus
} from './helpers.js';

// Toast
export { showToast, hideToast } from './toast.js';

// UI
export {
  elements,
  initElements,
  showLoginModal,
  hideLoginModal,
  showNewTenantModal,
  hideNewTenantModal,
  showTenantDetailsModal,
  hideTenantDetailsModal,
  renderTenantsTable,
  updateStats,
  openTenantDetails,
  setSubmitLoading,
  setFetchTenantDetailsFn
} from './ui.js';

// Events
export { setupEventListeners } from './events.js';
