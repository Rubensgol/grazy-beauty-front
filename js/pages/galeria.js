// Script para carregar as imagens da galeria a partir do backend
import { fetchWithAuth } from '../configuracao/http.js';
import { apiUrl } from '../configuracao/config.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { confirmarAcao } from '../modals/confirmar-acao.js';
import { LOG } from '../configuracao/logger.js';

async function fetchGalleryList() {
  LOG.debug('[fetchGalleryList] buscando imagens da galeria');
  try {
    const res = await fetchWithAuth('/api/images');
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    const json = await res.json();
    LOG.debug('[fetchGalleryList] dados recebidos', json);

    let lista = [];
    if (json && json.success && Array.isArray(json.data)) {
      lista = json.data;
    } else if (Array.isArray(json)) {
      lista = json;
    }

    LOG.debug('[fetchGalleryList] total de imagens', lista.length);
    return lista;
  } catch (err) {
    LOG.error('[fetchGalleryList] erro', err);
    adicionarNotificacao('Erro ao buscar imagens da galeria: ' + err.message, 'error');
    return [];
  }
}

function buildImageSrc(item) {
  // item pode ser string (filename) ou objeto
  if (!item) return null;
  if (typeof item === 'string') {
    return apiUrl(`/api/images/download/${encodeURIComponent(item)}`);
  }
  if (item.src) return item.src; // já tem URL completa
  if (item.storedFilename) {
    return apiUrl(`/api/images/download/${encodeURIComponent(item.storedFilename)}`);
  }
  if (item.filename) {
    return apiUrl(`/api/images/download/${encodeURIComponent(item.filename)}`);
  }
  return null;
}

function inserirImagemGrid(item) {
  const grid = document.querySelector('#galeria .grid');
  if (!grid) return;
  const src = buildImageSrc(item);
  if (!src) return;
  const desc = (typeof item === 'object' && item.descricao) ? item.descricao : (typeof item === 'object' && item.description) ? item.description : '';
  const wrapper = document.createElement('div');
  wrapper.className = 'relative group galeria-item';
  // Attach stored filename if present for delete actions
  const storedFilename = (typeof item === 'object' && (item.storedFilename || item.filename)) ? (item.storedFilename || item.filename) : (typeof item === 'string' ? item : null);
  if (storedFilename) wrapper.dataset.storedFilename = storedFilename;

  wrapper.innerHTML = `
    <img src="${src}" alt="${desc || 'Imagem'}" class="w-full h-full object-cover rounded-lg">
    <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
      <button class="galeria-delete-button text-white bg-red-600 hover:bg-red-700 rounded-full p-2" title="Excluir" data-stored-filename="${storedFilename || ''}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  `;
  grid.appendChild(wrapper);
}

// Delegated delete handler
document.addEventListener('click', async (e) => {
  const btn = e.target.closest && e.target.closest('.galeria-delete-button');
  if (!btn) return;

  try {
    const wrapper = btn.closest('.galeria-item');
    const storedFilename = btn.dataset.storedFilename || (wrapper && wrapper.dataset.storedFilename);

    if (!storedFilename) {
      // local-only image, just remove from DOM
      if (wrapper) wrapper.remove();
      adicionarNotificacao('Imagem removida localmente', 'info');
      return;
    }

    // Usar modal elegante de confirmação
    const confirmado = await confirmarAcao(
      'Excluir imagem',
      'Esta ação não pode ser desfeita. Tem certeza que deseja remover esta imagem permanentemente?',
      'delete'
    );

    if (!confirmado) return;

    const res = await fetchWithAuth(`/api/images/${encodeURIComponent(storedFilename)}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(text || 'Erro ao deletar imagem');
    }

    // removendo do DOM
    if (wrapper) wrapper.remove();
    adicionarNotificacao('Imagem removida com sucesso', 'success');
    LOG.debug('[galeria] imagem deletada:', storedFilename);
  } catch (err) {
    LOG.error('[galeria] erro ao deletar imagem:', err);
    adicionarNotificacao('Erro ao deletar imagem: ' + err.message, 'error');
  }
});

export async function initGaleriaPage() {
  LOG.debug('[initGaleriaPage] inicializando página Galeria');
  const list = await fetchGalleryList();
  // limpar grid antes
  const grid = document.querySelector('#galeria .grid');
  if (grid) grid.innerHTML = '';
  list.forEach(item => inserirImagemGrid(item));
  LOG.debug('[initGaleriaPage] galeria carregada com', list.length, 'imagens');
}

// Observar quando a página for adicionada dinamicamente ao DOM
function observarGaleria() {
  const pagesContainer = document.getElementById('pages-container');
  if (!pagesContainer) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.id === 'galeria') {
          LOG.debug('[observarGaleria] página galeria foi inserida');
          initGaleriaPage();
        }
      });
    });
  });
  observer.observe(pagesContainer, { childList: true });

  // Se já presente e visível
  const gal = document.getElementById('galeria');
  if (gal && !gal.classList.contains('hidden')) {
    LOG.debug('[observarGaleria] galeria já presente, inicializando');
    initGaleriaPage();
  }
}

// Inicializar quando página estiver pronta
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observarGaleria);
} else {
  observarGaleria();
}
