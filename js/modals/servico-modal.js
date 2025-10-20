import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from './notificacoes.js';
import { LOG } from '../configuracao/logger.js';

export async function ensureServicoModalIsLoaded() {
  if (document.getElementById('servico-modal')) {
    return;
  }

  try {
    LOG.debug('[servico-modal] carregando HTML do modal');
    const resp = await fetch('modals/servico.html');
    const html = await resp.text();
    
    let container = document.getElementById('modals-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modals-container';
      document.body.appendChild(container);
    }
    
    container.insertAdjacentHTML('beforeend', html);
    LOG.debug('[servico-modal] wireando modal');
    wireServicoModal();
  } catch (e) {
    LOG.error('[servico-modal] Erro ao carregar:', e);
    adicionarNotificacao('Erro ao carregar modal de serviço', 'error');
    throw e;
  }
}

// Carrega o modal HTML e inicia as listeners
export async function carregarEAbrirModalServico() {
  await ensureServicoModalIsLoaded();
  openServicoModal();
}

export function wireServicoModal() {
  const modal = document.getElementById('servico-modal');
  const form = document.getElementById('servico-form');
  const closeBtn = document.getElementById('close-servico-modal-button');
  const cancelBtn = document.getElementById('cancel-servico-modal-button');
  const title = modal.querySelector('h2');
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!form) {
    LOG.error('[servico-modal] formulário não encontrado');
    return;
  }

  // Fechar modal
  function closeServicoModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.style.zIndex = '';
      // Limpar form ao fechar
      form.reset();
      delete form.dataset.editingId;
      if (title) title.textContent = 'Adicionar Serviço';
      if (submitBtn) {
        submitBtn.textContent = 'Salvar';
        delete submitBtn.dataset.originalText;
      }
    }, 300);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeServicoModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeServicoModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeServicoModal();
    });
  }

  // Helper para fazer upload de imagem
  async function uploadImagem(file) {
    if (!file) return null;
    
    LOG.debug('[servico-modal] iniciando upload de imagem:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('forServico', 'true');

    try {
      const res = await fetchWithAuth('/api/images/upload', {
        method: 'POST',
        body: formData
        // NÃO definir Content-Type: FormData é enviado automaticamente
      });

      const json = await res.json();
      LOG.debug('[servico-modal] upload resposta:', res.status, json);

      if (!res.ok) {
        throw new Error(json.message || `Status ${res.status}`);
      }

      // Retorna o storedFilename ou filename
      const storedFilename = json.storedFilename || json.filename || json.data;
      LOG.debug('[servico-modal] storedFilename retornado:', storedFilename);
      return storedFilename;
    } catch (err) {
      LOG.error('[servico-modal] erro no upload:', err);
      throw new Error('Erro ao fazer upload da imagem: ' + err.message);
    }
  }

  // Salvar servico (POST para novo, PUT para editar)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    LOG.debug('[servico-modal] submit form');
    
    const fd = new FormData(form);
    const editingId = form.dataset.editingId;
    
    const horas = parseInt(fd.get('servico-duracao-horas'), 10) || 0;
    const minutos = parseInt(fd.get('servico-duracao-minutos'), 10) || 0;
    const duracaoMinutos = (horas * 60) + minutos;

    const data = {
      nome: fd.get('servico-nome'),
      descricao: fd.get('servico-descricao') || null,
      preco: parseFloat(fd.get('servico-preco')) || 0,
      duracaoMinutos: duracaoMinutos,
    };

    const imagemFile = fd.get('servico-imagem');

    try {
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Salvando...';
      submitBtn.disabled = true;

      // Se há uma nova imagem, fazer upload primeiro
      if (imagemFile && imagemFile.size > 0) {
        submitBtn.textContent = 'Enviando imagem...';
        const storedFilename = await uploadImagem(imagemFile);
        data.imageStoredFilename = storedFilename;
        LOG.debug('[servico-modal] dados agora contêm imageStoredFilename:', data.imageStoredFilename);
      }

      submitBtn.textContent = 'Salvando...';
      const method = editingId ? 'PUT' : 'POST';
      const urlPath = editingId ? `/api/servicos/${editingId}` : '/api/servicos';
      
      LOG.debug('[servico-modal] salvando', method, urlPath, data);
      const res = await fetchWithAuth(urlPath, {
        method,
        body: JSON.stringify(data)
      });

      const json = await res.json().catch(() => null);
      LOG.debug('[servico-modal] resposta', res.status, json);

      if (!res.ok) {
        const msg = json && json.message ? json.message : `Status ${res.status}`;
        throw new Error(msg);
      }

      const saved = (json && json.data) || (json && json.servico) || data;
      
      window.dispatchEvent(new CustomEvent(
        editingId ? 'servico:atualizado' : 'servico:adicionado',
        { detail: saved }
      ));

      adicionarNotificacao(
        `Serviço ${editingId ? 'atualizado' : 'adicionado'} com sucesso`,
        'success'
      );

      setTimeout(() => {
        closeServicoModal();
      }, 800);

    } catch (err) {
      LOG.error('[servico-modal] erro ao salvar:', err);
      adicionarNotificacao('Erro ao salvar serviço: ' + err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.dataset.originalText) {
          submitBtn.textContent = submitBtn.dataset.originalText;
        }
      }
    }
  });

  // Editar servico (disparado ao clicar em "Editar")
  window.addEventListener('servico:editar', (ev) => {
    const servico = ev.detail;
    if (!servico || !servico.id) {
      LOG.warn('[servico-modal] servico:editar sem ID válido');
      return;
    }

    LOG.debug('[servico-modal] editando servico:', servico.id);
    
    if (title) title.textContent = 'Editar Serviço';
    if (submitBtn) submitBtn.textContent = 'Atualizar';
    
    form.dataset.editingId = servico.id;
    form.querySelector('#servico-nome').value = servico.nome || '';
    form.querySelector('#servico-descricao').value = servico.descricao || '';
    form.querySelector('#servico-preco').value = servico.preco || '';

    // Preencher duração a partir de duracaoMinutos
    let horas = 0;
    let minutos = 0;
    
    if (servico.duracaoMinutos !== undefined && servico.duracaoMinutos !== null) {
      horas = Math.floor(servico.duracaoMinutos / 60);
      minutos = servico.duracaoMinutos % 60;
    } else if (servico.duracao) {
      // Fallback para parsing de string (formato antigo "1h 30min")
      const horasMatch = servico.duracao.match(/(\d+)h/);
      const minutosMatch = servico.duracao.match(/(\d+)min/);
      horas = horasMatch ? parseInt(horasMatch[1], 10) : 0;
      minutos = minutosMatch ? parseInt(minutosMatch[1], 10) : 0;
    }

    form.querySelector('#servico-duracao-horas').value = horas;
    form.querySelector('#servico-duracao-minutos').value = minutos;

    openServicoModal();
  });
}

export function openServicoModal() {
  const modal = document.getElementById('servico-modal');
  if (!modal) {
    LOG.error('[servico-modal] openServicoModal: modal não encontrado');
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

export function closeServicoModal() {
  const modal = document.getElementById('servico-modal');
  if (!modal) return;
  
  modal.classList.add('opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.style.zIndex = '';
  }, 300);
}
