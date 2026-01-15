import { apiUrl } from './config.js';

/**
 * Sistema de Autenticação Multi-Tenant
 * 
 * Cada tenant tem seu próprio token armazenado separadamente.
 * Chaves do localStorage:
 * - authToken_<tenantId>: Token do tenant específico
 * - authToken_master: Token do super admin (página de configuração de tenants)
 * - currentTenant: ID do tenant atual
 */

// Constante para identificar o super admin
const SUPER_ADMIN_KEY = 'master';

/**
 * Detecta o tenant atual pelo subdomínio ou parâmetro
 */
export function getCurrentTenant() {
  try {
    const hostname = window.location.hostname;
    
    // Se for localhost ou IP, verificar parâmetro ou usar padrão
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantParam = urlParams.get('tenant');
      if (tenantParam) return tenantParam;
      
      // Verificar se há tenant salvo
      const savedTenant = localStorage.getItem('currentTenant');
      if (savedTenant) return savedTenant;
      
      return 'default';
    }
    
    // Extrair subdomínio (ex: joao.grazybeauty.com.br → joao)
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return parts[0];
    }
    
    return 'default';
  } catch (e) {
    console.error('[auth] Erro ao detectar tenant:', e);
    return 'default';
  }
}

/**
 * Define o tenant atual
 */
export function setCurrentTenant(tenantId) {
  try {
    localStorage.setItem('currentTenant', tenantId);
  } catch (e) {
    console.error('[auth] Erro ao salvar tenant:', e);
  }
}

/**
 * Gera a chave do localStorage para o token do tenant
 */
function getTokenKey(tenantId = null) {
  const tenant = tenantId || getCurrentTenant();
  return `authToken_${tenant}`;
}

/**
 * Obtém o token de autenticação do tenant atual
 */
export function getAuthToken(tenantId = null) {
  try {
    const key = getTokenKey(tenantId);
    return localStorage.getItem(key) || null;
  } catch (e) {
    console.error('[auth] Erro ao obter token:', e);
    return null;
  }
}

/**
 * Salva o token de autenticação do tenant
 */
export function setAuthToken(token, tenantId = null) {
  try {
    const key = getTokenKey(tenantId);
    localStorage.setItem(key, token);
    
    // Atualizar tenant atual se especificado
    if (tenantId) {
      setCurrentTenant(tenantId);
    }
  } catch (e) {
    console.error('[auth] Erro ao salvar token:', e);
  }
}

/**
 * Obtém o token do Super Admin (para página de configuração de tenants)
 */
export function getSuperAdminToken() {
  try {
    return localStorage.getItem(`authToken_${SUPER_ADMIN_KEY}`) || null;
  } catch (e) {
    console.error('[auth] Erro ao obter token do super admin:', e);
    return null;
  }
}

/**
 * Salva o token do Super Admin
 */
export function setSuperAdminToken(token) {
  try {
    localStorage.setItem(`authToken_${SUPER_ADMIN_KEY}`, token);
  } catch (e) {
    console.error('[auth] Erro ao salvar token do super admin:', e);
  }
}

/**
 * Verifica se o usuário atual é super admin
 */
export function isSuperAdmin() {
  return getSuperAdminToken() !== null;
}

// Validar token no servidor
export async function validateToken(tenantId = null) 
{
  const token = getAuthToken(tenantId);
  
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(apiUrl('/api/auth/validate'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401 || response.status === 403 || !response.ok) {
      clearAuth(tenantId);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[auth] Erro ao validar token:', error);
    return null; // null indica erro de validação, não token inválido
  }
}

/**
 * Valida token do Super Admin
 */
export async function validateSuperAdminToken() {
  const token = getSuperAdminToken();
  
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(apiUrl('/api/auth/validate-master'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401 || response.status === 403 || !response.ok) {
      clearSuperAdminAuth();
      return false;
    }

    return true;
  } catch (error) {
    console.error('[auth] Erro ao validar token do super admin:', error);
    return null;
  }
}

export async function requireAuth({ redirectTo = '/login.html', validateRemote = false, tenantId = null } = {}) 
{
  const token = getAuthToken(tenantId);

  if (!token) 
  {
    window.location.replace(redirectTo);
    return false;
  }

  if (validateRemote) {
    const isValid = await validateToken(tenantId);
    
    if (isValid === false) {
      // Token explicitamente inválido
      window.location.replace(redirectTo);
      return false;
    }
  }

  return true;
}

/**
 * Requer autenticação de Super Admin
 */
export async function requireSuperAdminAuth({ redirectTo = '/admin-master.html', validateRemote = false } = {}) {
  const token = getSuperAdminToken();

  if (!token) {
    window.location.replace(redirectTo);
    return false;
  }

  if (validateRemote) {
    const isValid = await validateSuperAdminToken();
    
    if (isValid === false) {
      window.location.replace(redirectTo);
      return false;
    }
  }

  return true;
}

export function clearAuth(tenantId = null) 
{
  try {
    const key = getTokenKey(tenantId);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('[auth] Erro ao limpar auth:', e);
  }
}

/**
 * Limpa autenticação do Super Admin
 */
export function clearSuperAdminAuth() {
  try {
    localStorage.removeItem(`authToken_${SUPER_ADMIN_KEY}`);
  } catch (e) {
    console.error('[auth] Erro ao limpar auth do super admin:', e);
  }
}

/**
 * Limpa todos os tokens de autenticação (todos os tenants)
 */
export function clearAllAuth() {
  try {
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('authToken_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('currentTenant');
  } catch (e) {
    console.error('[auth] Erro ao limpar todas as auth:', e);
  }
}

/**
 * Faz logout do usuário e redireciona para login
 */
export function logout(redirectTo = '/login.html', tenantId = null) 
{
  clearAuth(tenantId);
  
  // Limpar outros dados do localStorage específicos do tenant
  const tenant = tenantId || getCurrentTenant();
  try {
    localStorage.removeItem(`tenantConfig_${tenant}`);
    localStorage.removeItem(`userData_${tenant}`);
    localStorage.removeItem(`lastPage_${tenant}`);
    
    // Manter compatibilidade com chaves antigas
    localStorage.removeItem('tenantConfig');
    localStorage.removeItem('userData');
    localStorage.removeItem('lastPage');
  } catch (e) {
    console.error('[auth] Erro ao limpar dados do tenant:', e);
  }
  
  window.location.replace(redirectTo);
}

/**
 * Faz logout do Super Admin
 */
export function logoutSuperAdmin(redirectTo = '/admin-master.html') {
  clearSuperAdminAuth();
  
  try {
    localStorage.removeItem('masterUserData');
  } catch (e) {
    console.error('[auth] Erro ao limpar dados do super admin:', e);
  }
  
  window.location.replace(redirectTo);
}

/**
 * Obtém lista de tenants com sessão ativa
 */
export function getActiveTenantSessions() {
  const sessions = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('authToken_') && key !== `authToken_${SUPER_ADMIN_KEY}`) {
        const tenantId = key.replace('authToken_', '');
        sessions.push({
          tenantId,
          hasToken: !!localStorage.getItem(key)
        });
      }
    }
  } catch (e) {
    console.error('[auth] Erro ao listar sessões:', e);
  }
  
  return sessions;
}

/**
 * Troca para outro tenant (se já tiver sessão ativa)
 */
export function switchTenant(tenantId) {
  const token = getAuthToken(tenantId);
  
  if (!token) {
    console.warn('[auth] Tenant não possui sessão ativa:', tenantId);
    return false;
  }
  
  setCurrentTenant(tenantId);
  return true;
}
