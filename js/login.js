import { apiUrl } from './configuracao/config.js';
import { getAuthToken, setAuthToken, getCurrentTenant, setCurrentTenant } from './configuracao/auth.js';

async function doLogin(ev) {
  ev.preventDefault();
  const form = ev.target;
  const usuario = form.querySelector('#login').value.trim();
  const senha = form.querySelector('#password').value;
  const btn = form.querySelector('button[type="submit"]');
  const originalTxt = btn ? btn.textContent : '';
  
  // Detectar tenant atual
  const currentTenant = getCurrentTenant();
  
  try {
    // Validação básica antes de enviar
    if (!usuario) { showLoginError('Por favor, informe seu login.'); if (btn) { btn.disabled = false; btn.textContent = originalTxt; } return; }
    if (!senha) { showLoginError('Por favor, informe sua senha.'); if (btn) { btn.disabled = false; btn.textContent = originalTxt; } return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }

    let resp;
    
    try {
      // Usar endpoint V2 que valida tenant baseado no Host
      // O navegador já envia o header Host automaticamente
      resp = await fetch(apiUrl('/api/auth/login/v2'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant  // Envia o tenant ID no header
        },
        body: JSON.stringify({ usuario, senha, tenantNome: currentTenant })
      });
    } catch (netErr) {
  showLoginError('Não foi possível conectar ao servidor. Verifique sua conexão.');
  if (btn) { btn.textContent = originalTxt; btn.disabled = false; }
      return;
    }

    if (!resp.ok) {
      // Mapear status para mensagens mais amigáveis
      if (resp.status === 403) {
        // Tentar extrair mensagem específica do servidor
        const errBody = await resp.json().catch(() => null);
        const msg = errBody?.mensagem || errBody?.message || errBody?.error;
        
        // Mostrar mensagem específica de tenant ou erro genérico
        if (msg) {
          showLoginError(msg);
        } else {
          showLoginError('Acesso negado. Verifique se você está acessando o domínio correto.');
        }
        if (btn) { btn.textContent = originalTxt; btn.disabled = false; }
        return;
      }
      if (resp.status === 401) {
        // Tentar extrair mensagem específica do servidor
        const errBody = await resp.json().catch(() => null);
        const msg = errBody?.mensagem || errBody?.message || errBody?.error;
        
        // Se a mensagem menciona tenant, mostrar erro específico
        if (msg && msg.toLowerCase().includes('tenant')) {
          showLoginError('Usuário não pertence a este tenant. Verifique se você está acessando o domínio correto.');
        } else {
          showLoginError('Login ou senha incorretos. Verifique e tente novamente.');
        }
        if (btn) { btn.textContent = originalTxt; btn.disabled = false; }
        return;
      }
      if (resp.status >= 500) {
      showLoginError('Erro no servidor. Tente novamente mais tarde.');
      if (btn) { btn.textContent = originalTxt; btn.disabled = false; }
      return;
      }
      // tentar extrair mensagem do corpo
      const errBody = await resp.json().catch(()=>null);
      const msg = errBody?.message || errBody?.error || 'Erro ao autenticar. Tente novamente.';
    showLoginError(msg);
    if (btn) { btn.textContent = originalTxt; btn.disabled = false; }
    return;
    }

    const body = await resp.json();
    // suporte para { token } ou { data: { token } }
    const token = body.token || (body.data && body.data.token);
    if (!token) throw new Error('Token não retornado pelo servidor');
    
    // Salvar token específico do tenant
    setAuthToken(token, currentTenant);
    setCurrentTenant(currentTenant);
    
    // redirecionar para painel
    window.location.href = '/painelAdm.html';
  } catch (e) {
  showLoginError(e.message || 'Erro ao autenticar');
  if (btn) { btn.textContent = originalTxt; btn.disabled = false; }
  }
}

// Helper: load modal fragment once and wire handlers
let __loginModalLoaded = false;
async function ensureLoginModal() {
  if (__loginModalLoaded) return;
  try {
    const resp = await fetch('modals/login-error.html');
    if (!resp.ok) return; // silently fail
    const html = await resp.text();
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('login-error-modal');
    const msgEl = document.getElementById('login-error-message');
    const close = document.getElementById('login-error-close');
    const ok = document.getElementById('login-error-ok');
  function hideModal() { if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex-center'); } }
    if (close) close.addEventListener('click', hideModal);
    if (ok) ok.addEventListener('click', hideModal);
    if (ok) ok.addEventListener('keydown', (e) => { if (e.key === 'Enter') hideModal(); });
    __loginModalLoaded = true;
  } catch (e) {
  }
}

async function showLoginError(msg) {
  await ensureLoginModal();
  const modal = document.getElementById('login-error-modal');
  const msgEl = document.getElementById('login-error-message');
  if (msgEl) msgEl.textContent = msg;
  if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex-center');
    const ok = document.getElementById('login-error-ok'); if (ok) ok.focus(); }
}

/**
 * Detectar tenant pelo subdomínio e carregar branding
 */
async function loadTenantBranding() {
  try {
    const hostname = window.location.hostname;
    
    // Se for localhost ou IP, não buscar tenant
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return;
    }
    
    // Extrair subdomínio (ex: joao.grazybeauty.com.br → joao)
    const parts = hostname.split('.');
    let subdomain = null;
    if (parts.length > 2 && parts[0] !== 'www') {
      subdomain = parts[0];
    }
    
    if (!subdomain) return;
    
    // Buscar configuração do tenant
    const resp = await fetch(apiUrl(`/api/config?tenant=${subdomain}`));
    if (!resp.ok) return;
    
    const data = await resp.json();
    const config = data.data || data;
    
    applyLoginBranding(config);
  } catch (err) {
    console.log('[login] Usando branding padrão:', err.message);
  }
}

/**
 * Aplicar branding na página de login
 */
function applyLoginBranding(config) {
  const root = document.documentElement;
  
  // Aplicar cor principal
  if (config.primaryColor) {
    root.style.setProperty('--login-accent', config.primaryColor);
    root.style.setProperty('--login-accent-hover', adjustColor(config.primaryColor, -15));
  }
  
  // Nome do negócio
  if (config.businessName) {
    document.title = `Login - ${config.businessName}`;
    
    const brandName = document.getElementById('login-brand-name');
    const mobileTitle = document.getElementById('login-mobile-title');
    
    if (brandName) brandName.textContent = config.businessName;
    if (mobileTitle) mobileTitle.textContent = config.businessName;
  }
  
  // Tagline
  if (config.tagline || config.businessTagline) {
    const tagline = config.tagline || config.businessTagline;
    const brandTagline = document.getElementById('login-brand-tagline');
    const mobileSubtitle = document.getElementById('login-mobile-subtitle');
    
    if (brandTagline) brandTagline.textContent = tagline;
    if (mobileSubtitle) mobileSubtitle.textContent = tagline;
  }
  
  // Logo
  if (config.logoUrl) {
    const defaultLogo = document.getElementById('login-default-logo');
    const customLogo = document.getElementById('login-custom-logo');
    
    if (defaultLogo && customLogo) {
      customLogo.src = config.logoUrl;
      customLogo.classList.remove('hidden');
      defaultLogo.classList.add('hidden');
    }
  }
}

/**
 * Ajustar cor (clarear/escurecer)
 */
function adjustColor(hex, percent) {
  if (!hex) return hex;
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

document.addEventListener('DOMContentLoaded', () => 
{
  // Carregar branding do tenant primeiro
  loadTenantBranding();
  
  // Verificar se já tem token para o tenant atual
  const currentTenant = getCurrentTenant();
  if (getAuthToken(currentTenant)) {
    window.location.replace('/painelAdm.html');
    return;
  }
  
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', doLogin);
  }
});
