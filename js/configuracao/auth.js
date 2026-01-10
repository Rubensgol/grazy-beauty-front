import { apiUrl } from './config.js';

export function getAuthToken() 
{
  try { return localStorage.getItem('authToken') || null; } catch (e) { return null; }
}

// Validar token no servidor
export async function validateToken() 
{
  const token = getAuthToken();
  
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
      clearAuth();
      return false;
    }

    return true;
  } catch (error) {
    console.error('[auth] Erro ao validar token:', error);
    return null; // null indica erro de validação, não token inválido
  }
}

export async function requireAuth({ redirectTo = '/login.html', validateRemote = false } = {}) 
{
  const token = getAuthToken();

  if (!token) 
  {
    window.location.replace(redirectTo);
    return false;
  }

  if (validateRemote) {
    const isValid = await validateToken();
    
    if (isValid === false) {
      // Token explicitamente inválido
      window.location.replace(redirectTo);
      return false;
    }
  }

  return true;
}

export function clearAuth() 
{
  try { localStorage.removeItem('authToken'); } catch (e) {}
}

/**
 * Faz logout do usuário e redireciona para login
 */
export function logout(redirectTo = '/login.html') 
{
  clearAuth();
  // Limpar outros dados do localStorage
  try {
    localStorage.removeItem('tenantConfig');
    localStorage.removeItem('userData');
    localStorage.removeItem('lastPage');
  } catch (e) {}
  
  window.location.replace(redirectTo);
}
