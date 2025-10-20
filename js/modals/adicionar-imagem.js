// Modal para adicionar imagem na galeria
import { adicionarNotificacao } from './notificacoes.js';
import { fetchWithAuth } from '../configuracao/http.js';
import { apiUrl } from '../configuracao/config.js';
import { LOG } from '../configuracao/logger.js';
import { initGaleriaPage } from '../pages/galeria.js';

export async function carregarModalAdicionarImagem() {
  const resp = await fetch('modals/adicionar-imagem.html');
  const html = await resp.text();
  document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('modal-adicionar-imagem');
  const form = document.getElementById('form-adicionar-imagem');
  const closeBtn = document.getElementById('close-modal-adicionar-imagem');
  const cancelBtn = document.getElementById('cancel-adicionar-imagem');

  // Abrir modal ao clicar no botão (delegation) — funciona mesmo com páginas carregadas dinamicamente
  document.addEventListener('click', (e) => {
    try {
      if (e.target.closest && e.target.closest('.adicionar-imagem-button')) {
        // localizar o modal no momento do clique (defensivo)
        const modalEl = document.getElementById('modal-adicionar-imagem') || modal;
        if (modalEl) {
          modalEl.classList.remove('hidden');
        } else {
          console.warn('Modal adicionar-imagem não encontrado no clique; certificando-se de carregar o modal');
          carregarModalAdicionarImagem();
          // deixar um pequeno timeout para abrir assim que inserido
          setTimeout(() => {
            const m = document.getElementById('modal-adicionar-imagem');
            if (m) m.classList.remove('hidden');
          }, 100);
        }
      }
    } catch (err) {
      console.error('Erro ao tentar abrir modal adicionar-imagem:', err);
    }
  });

  closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  // Fechar ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('imagem-url').value.trim();
    const fileInput = document.getElementById('imagem-file');
    const descricao = document.getElementById('imagem-descricao').value.trim();

    // Se houver URL, usa direto; se houver arquivo, converte para upload
    if (!url && fileInput.files.length === 0) {
      adicionarNotificacao('Envie uma URL ou um arquivo', 'error');
      return;
    }

    try {
      if (url) {
        // Envio por URL -> POST JSON para /api/images/from-url
        LOG.debug('[form-adicionar-imagem] enviando por URL', url);
        const res = await fetchWithAuth(apiUrl('/api/images/from-url'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, descricao })
        });
        if (!res.ok) {
          throw new Error(`Resposta não-ok do servidor: ${res.status}`);
        }
        const json = await res.json();
        LOG.debug('[form-adicionar-imagem] resposta do servidor', json);
        adicionarNotificacao('Imagem adicionada com sucesso', 'success');
        modal.classList.add('hidden');
        form.reset();
        // Recarregar galeria
        initGaleriaPage();
      } else {
        // Envio por arquivo -> multipart/form-data para /api/images/upload
        const file = fileInput.files[0];
        LOG.debug('[form-adicionar-imagem] enviando arquivo', file.name, file.size, 'bytes');
        const formData = new FormData();
        formData.append('file', file);
        if (descricao) formData.append('descricao', descricao);

        const res = await fetchWithAuth(apiUrl('/api/images/upload'), {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          throw new Error(`Resposta não-ok do servidor: ${res.status}`);
        }
        const json = await res.json();
        LOG.debug('[form-adicionar-imagem] resposta do servidor', json);
        adicionarNotificacao('Imagem enviada com sucesso', 'success');
        modal.classList.add('hidden');
        form.reset();
        // Recarregar galeria
        initGaleriaPage();
      }
    } catch (error) {
      LOG.error('[form-adicionar-imagem] erro', error);
      adicionarNotificacao('Erro ao adicionar imagem: ' + error.message, 'error');
    }
  });
}

// Carrega o modal ao iniciar. Se o DOM já estiver pronto, executa imediatamente.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', carregarModalAdicionarImagem);
} else {
  carregarModalAdicionarImagem();
}
