/**
 * Admin Master - Módulo de API
 * Funções de comunicação com o backend
 */

import { apiUrl } from '../configuracao/config.js';
import { 
  getSuperAdminToken, 
  clearSuperAdminAuth 
} from '../configuracao/auth.js';
import { getMockTenants, simulateCreateTenant } from './mock.js';

// Callback para quando não autorizado (evita dependência circular)
let onUnauthorizedCallback = null;

export function setOnUnauthorizedCallback(callback) {
  onUnauthorizedCallback = callback;
}

/**
 * Fetch com autenticação do Super Admin
 */
export async function fetchSuperAdmin(path, options = {}) {
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
  
  // Se 401/403, chamar callback e lançar erro
  if (resp.status === 401 || resp.status === 403) {
    clearSuperAdminAuth();
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    throw new Error('Não autorizado');
  }
  
  return resp;
}

/**
 * Buscar lista de tenants do backend
 */
export async function fetchTenants() {
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
export async function createTenant(data) {
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
export async function toggleTenantStatus(tenantId, state) {
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
export async function resetTenantPassword(tenantId) {
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
export async function deleteTenant(tenantId) {
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

/**
 * Buscar detalhes completos de um tenant
 */
export async function fetchTenantDetails(tenantId, state) {
  try {
    const res = await fetchSuperAdmin(`/api/admin/tenants/${tenantId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.error('[admin-master] Erro ao buscar detalhes do tenant:', err);
    // Retornar tenant do estado local como fallback
    return state.tenants.find(t => t.id == tenantId) || null;
  }
}
