import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from './notificacoes.js';
import { LOG } from '../configuracao/logger.js';

// Carrega o modal HTML e inicia as listeners
export async function carregarEAbrirModalCliente() {
  if (document.getElementById('cliente-modal')) {
    openClienteModal();
    return;
  }

  try {
    LOG.debug('[cliente-modal] carregando HTML do modal');
  const resp = await fetch('modals/form-cliente.html');
    const html = await resp.text();
    
    let container = document.getElementById('modals-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modals-container';
      document.body.appendChild(container);
    }
    
    container.insertAdjacentHTML('beforeend', html);
    LOG.debug('[cliente-modal] wireando modal');
    wireClienteModal();
    openClienteModal();
  } catch (e) {
    LOG.error('[cliente-modal] Erro ao carregar:', e);
    adicionarNotificacao('Erro ao carregar modal', 'error');
  }
}

export function wireClienteModal() {
  const modal = document.getElementById('cliente-modal');
  const form = document.getElementById('cliente-form');
  const closeBtn = document.getElementById('close-cliente-modal-button');
  const cancelBtn = document.getElementById('cancel-cliente-modal-button');
  const title = document.getElementById('cliente-modal-title');
  const submitBtn = document.getElementById('cliente-submit-button');

  if (!form) {
    LOG.error('[cliente-modal] formulário não encontrado');
    return;
  }

  // Fechar modal
  function closeClienteModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.style.zIndex = '';
    }, 300);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeClienteModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeClienteModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeClienteModal();
    });
  }

  // Salvar cliente (POST para novo, PUT para editar)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    LOG.debug('[cliente-modal] submit form');
    
    const fd = new FormData(form);
    const editingId = form.dataset.editingId;
    const data = {
      nome: fd.get('cliente-nome'),
      email: fd.get('cliente-email'),
      telefone: fd.get('cliente-telefone') || null,
  obs: fd.get('cliente-anotacoes') || null
    };

    try {
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Salvando...';
      submitBtn.disabled = true;

      const method = editingId ? 'PUT' : 'POST';
      const urlPath = editingId ? `/api/cliente/${editingId}` : '/api/cliente';
      
      LOG.debug('[cliente-modal] salvando', method, urlPath, data);
      const res = await fetchWithAuth(urlPath, {
        method,
        body: JSON.stringify(data)
      });

      const json = await res.json().catch(() => null);
      LOG.debug('[cliente-modal] resposta', res.status, json);

      if (!res.ok) {
        const msg = json && json.message ? json.message : `Status ${res.status}`;
        throw new Error(msg);
      }

      // Normaliza resposta
      const saved = (json && json.data) || (json && json.cliente) || data;
      const normalized = normalizarCliente(saved);
      
      LOG.debug('[cliente-modal] cliente salvo normalizado:', normalized);
      
      // Dispara evento para atualizar lista
      window.dispatchEvent(new CustomEvent(
        editingId ? 'cliente:atualizado' : 'cliente:adicionado',
        { detail: normalized }
      ));

      adicionarNotificacao(
        `Cliente ${editingId ? 'atualizado' : 'adicionado'} com sucesso`,
        'success'
      );

      setTimeout(() => {
        closeClienteModal();
      }, 800);

      form.reset();
      delete form.dataset.editingId;
      if (title) title.textContent = 'Adicionar Cliente';
      if (submitBtn) submitBtn.textContent = submitBtn.dataset.originalText;

    } catch (err) {
      LOG.error('[cliente-modal] erro ao salvar:', err);
      adicionarNotificacao('Erro ao salvar cliente: ' + err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.dataset.originalText) {
          submitBtn.textContent = submitBtn.dataset.originalText;
        }
      }
    }
  });

  // Editar cliente (disparado ao clicar em "Editar")
  window.addEventListener('cliente:editar', (ev) => {
    const c = normalizarCliente(ev.detail);
    if (!c || !c.id) {
      LOG.warn('[cliente-modal] cliente:editar sem ID válido');
      return;
    }

    LOG.debug('[cliente-modal] editando cliente:', c.id);
    
    if (title) title.textContent = 'Editar Cliente';
    if (submitBtn) submitBtn.textContent = 'Atualizar';
    
    form.dataset.editingId = c.id;
    form.querySelector('#cliente-nome').value = c.nome || '';
    form.querySelector('#cliente-email').value = c.email || '';
    
    const telEl = form.querySelector('#cliente-telefone');
    if (telEl) telEl.value = c.telefone || '';
    
  const obsEl = form.querySelector('#cliente-anotacoes');
    if (obsEl) obsEl.value = c.obs || '';

    // Abrir modal
    openClienteModal();
  });
}

export function openClienteModal() {
  const modal = document.getElementById('cliente-modal');
  if (!modal) {
    LOG.error('[cliente-modal] openClienteModal: modal não encontrado');
    return;
  }

  try {
    document.body.appendChild(modal);
  } catch (e) {
    // modal já está no DOM
  }

  modal.style.zIndex = '99999';
  modal.classList.remove('hidden');
  modal.offsetHeight;
  setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

export function closeClienteModal() {
  const modal = document.getElementById('cliente-modal');
  if (!modal) return;
  
  modal.classList.add('opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.style.zIndex = '';
  }, 300);
}

function normalizarCliente(c = {}) {
  if (!c || typeof c !== 'object') return {};
  const id = c.id || c.idUsuario || c.id_usuario || c.usuarioId || null;
  const nome = c.nome || c.nomeUsuario || c.nome_usuario || c.name || '';
  const email = c.email || c.mail || c.emailUsuario || '';
  const telefone = c.telefone || c.fone || c.celular || null;
  const obs = c.obs || c.observacoes || c.observacao || null;
  return { ...c, id, nome, email, telefone, obs };
}
