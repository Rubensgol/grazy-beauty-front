import { apiUrl } from './config.js';
import { LOG } from './logger.js';
import { clearAuth } from './auth.js';

// Flag para evitar múltiplos redirecionamentos simultâneos
let isRedirecting = false;

function getToken() {
  try { return localStorage.getItem('authToken') || null; } catch { return null; }
}

export async function fetchWithAuth(path, options = {}) {
  const url = path.startsWith('http') ? path : apiUrl(path);
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Log de diagnóstico
  try {
    LOG.debug('[fetchWithAuth] request', { url, method: (options && options.method) || 'GET', hasToken: !!token, headers: Object.fromEntries(headers.entries()) });
    const resp = await fetch(url, { ...options, headers });
    LOG.debug('[fetchWithAuth] response status', resp.status, 'for', url);
    
    if (resp.status === 401 || resp.status === 403) {
      // Log antes do processamento
      let bodyText = '';
      try { bodyText = await resp.text(); } catch (_) {}
      LOG.warn(`[fetchWithAuth] ${resp.status} para ${url}; corpo: ${bodyText}`);
      
      // Evitar múltiplos redirecionamentos simultâneos
      if (isRedirecting) {
        LOG.debug('[fetchWithAuth] Redirecionamento já em andamento, ignorando');
        return Promise.reject(new Error('Não autorizado'));
      }
      
      // Marcar que está redirecionando
      isRedirecting = true;
      
      // Limpar token inválido/expirado
      clearAuth();
      LOG.info('[fetchWithAuth] Token limpo devido a não autorização');
      
      // Verificar se já estamos na página de login para evitar loop
      const currentPath = window.location.pathname;
      if (!currentPath.includes('login.html')) {
        LOG.info('[fetchWithAuth] Redirecionando para login');
        // Adicionar pequeno delay para garantir que outras requisições não iniciem
        setTimeout(() => {
          window.location.replace('/login.html');
        }, 100);
      } else {
        // Já estamos no login, resetar flag
        isRedirecting = false;
      }
      
      return Promise.reject(new Error('Não autorizado'));
    }
    return resp;
  } catch (err) {
    LOG.error('[fetchWithAuth] erro de rede', err);
    throw err;
  }
}
