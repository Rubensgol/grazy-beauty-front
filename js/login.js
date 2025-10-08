import { apiUrl } from './config.js';

async function doLogin(ev) {
  ev.preventDefault();
  const form = ev.target;
  const usuario = form.querySelector('#login').value.trim();
  const senha = form.querySelector('#password').value;
  const btn = form.querySelector('button[type="submit"]');
  const originalTxt = btn ? btn.textContent : '';
  try {
    // Validação básica antes de enviar
    if (!usuario) { showLoginError('Por favor, informe seu login.'); if (btn) { btn.disabled = false; btn.textContent = originalTxt; } return; }
    if (!senha) { showLoginError('Por favor, informe sua senha.'); if (btn) { btn.disabled = false; btn.textContent = originalTxt; } return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }

    let resp;
    
    try {
      resp = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });
    } catch (netErr) {
  showLoginError('Não foi possível conectar ao servidor. Verifique sua conexão.');
  if (btn) { btn.textContent = originalTxt; btn.disabled = false; }
      return;
    }

    if (!resp.ok) {
      // Mapear status para mensagens mais amigáveis
      if (resp.status === 401 || resp.status === 403) {
      showLoginError('Login ou senha incorretos. Verifique e tente novamente.');
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
    localStorage.setItem('authToken', token);
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
    // ignore
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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[onsubmit]');
  if (form) {
    // substituir onsubmit inline por listener mais robusto
    form.removeAttribute('onsubmit');
    form.addEventListener('submit', doLogin);
  }
});
