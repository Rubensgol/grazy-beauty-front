// Script para carregar as imagens da galeria a partir do backend
import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { confirmarAcao } from '../modals/confirmar-acao.js';
import { LOG } from '../configuracao/logger.js';
import { apiUrl } from '../configuracao/config.js';

let ordenacaoAlterada = false;

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
  if (!item) return null;
  if (typeof item === 'string') {
    return `/api/images/download/${encodeURIComponent(item)}`;
  }
  if (item.src) return item.src;
  if (item.storedFilename) {
    return `/api/images/download/${encodeURIComponent(item.storedFilename)}`;
  }
  if (item.filename) {
    return `/api/images/download/${encodeURIComponent(item.filename)}`;
  }
  return null;
}

function inserirImagemGrid(item) {
  const grid = document.querySelector('#galeria-grid');
  if (!grid) {
    LOG.warn('[inserirImagemGrid] grid #galeria-grid não encontrado');
    return;
  }
  const src = apiUrl(buildImageSrc(item));
  if (!src) return;
  
  const desc = (typeof item === 'object' && item.descricao) ? item.descricao : (typeof item === 'object' && item.description) ? item.description : '';
  const storedFilename = (typeof item === 'object' && (item.storedFilename || item.filename)) ? (item.storedFilename || item.filename) : (typeof item === 'string' ? item : null);
  const exibirLanding = (typeof item === 'object' && item.exibirLanding === true);
  const ordemLanding = (typeof item === 'object' && item.ordemLanding !== undefined) ? item.ordemLanding : 999;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'relative group galeria-item rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-move';
  wrapper.draggable = true;
  if (storedFilename) {
    wrapper.dataset.storedFilename = storedFilename;
    wrapper.dataset.ordemLanding = ordemLanding;
  }

  // Badge de Landing (se ativo)
  const landingBadge = exibirLanding 
    ? `<div class="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow pointer-events-none z-10">⭐ Landing</div>` 
    : '';

  wrapper.innerHTML = `
    ${landingBadge}
    <img src="${src}" alt="${desc || 'Imagem'}" class="w-full h-40 object-cover">
    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all z-20">
      <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="galeria-landing-button text-white ${exibirLanding ? 'bg-yellow-500' : 'bg-gray-600'} hover:bg-yellow-600 rounded-full p-2 transition-colors" 
                title="${exibirLanding ? 'Remover da Landing' : 'Adicionar à Landing'}" 
                data-stored-filename="${storedFilename || ''}" 
                data-exibir-landing="${exibirLanding}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="${exibirLanding ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        <button class="galeria-delete-button text-white bg-red-600 hover:bg-red-700 rounded-full p-2 transition-colors" 
                title="Excluir" 
                data-stored-filename="${storedFilename || ''}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  `;
  grid.appendChild(wrapper);
}

// Toggle exibir na landing
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.galeria-landing-button');
  if (!btn) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const storedFilename = btn.dataset.storedFilename;
  if (!storedFilename) return;
  
  const currentValue = btn.dataset.exibirLanding === 'true';
  const newValue = !currentValue;
  
  try {
    const res = await fetchWithAuth(`/api/images/${encodeURIComponent(storedFilename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exibirLanding: newValue })
    });
    
    if (!res.ok) {
      throw new Error('Erro ao atualizar imagem');
    }
    
    // Atualizar UI
    btn.dataset.exibirLanding = newValue;
    const svg = btn.querySelector('svg');
    const wrapper = btn.closest('.galeria-item');
    
    if (newValue) {
      btn.classList.remove('bg-gray-600');
      btn.classList.add('bg-yellow-500');
      btn.title = 'Remover da Landing';
      svg.setAttribute('fill', 'currentColor');
      // Adicionar badge
      if (!wrapper.querySelector('.bg-yellow-500.text-xs')) {
        const badge = document.createElement('div');
        badge.className = 'absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow pointer-events-none z-10';
        badge.innerHTML = '⭐ Landing';
        wrapper.insertBefore(badge, wrapper.firstChild);
      }
      adicionarNotificacao('Imagem adicionada à landing page', 'success');
    } else {
      btn.classList.remove('bg-yellow-500');
      btn.classList.add('bg-gray-600');
      btn.title = 'Adicionar à Landing';
      svg.setAttribute('fill', 'none');
      // Remover badge
      const badge = wrapper.querySelector('.bg-yellow-500.text-xs');
      if (badge) badge.remove();
      adicionarNotificacao('Imagem removida da landing page', 'info');
    }
  } catch (err) {
    LOG.error('[galeria] erro ao atualizar exibirLanding:', err);
    adicionarNotificacao('Erro ao atualizar imagem: ' + err.message, 'error');
  }
});

// Delegated delete handler
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.galeria-delete-button');
  if (!btn) return;
  
  e.preventDefault();
  e.stopPropagation();

  try {
    const wrapper = btn.closest('.galeria-item');
    const storedFilename = btn.dataset.storedFilename || (wrapper && wrapper.dataset.storedFilename);

    if (!storedFilename) {
      if (wrapper) wrapper.remove();
      adicionarNotificacao('Imagem removida localmente', 'info');
      return;
    }

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

    if (wrapper) wrapper.remove();
    adicionarNotificacao('Imagem removida com sucesso', 'success');
    LOG.debug('[galeria] imagem deletada:', storedFilename);
  } catch (err) {
    LOG.error('[galeria] erro ao deletar imagem:', err);
    adicionarNotificacao('Erro ao deletar imagem: ' + err.message, 'error');
  }
});

// Drag and Drop para reordenação
function setupDragAndDrop() {
  const grid = document.querySelector('#galeria-grid');
  if (!grid) return;
  
  let draggedItem = null;
  
  grid.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.galeria-item');
    if (item) {
      draggedItem = item;
      item.style.opacity = '0.5';
      item.classList.add('dragging');
      // Mostrar botão de salvar ordem
      const btnOrdenar = document.getElementById('btn-ordenar-galeria');
      if (btnOrdenar) btnOrdenar.classList.remove('hidden');
    }
  });
  
  grid.addEventListener('dragend', (e) => {
    const item = e.target.closest('.galeria-item');
    if (item) {
      item.style.opacity = '1';
      item.classList.remove('dragging');
      draggedItem = null;
    }
  });
  
  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const afterElement = getDragAfterElement(grid, e.clientX, e.clientY);
    if (afterElement == null) {
      grid.appendChild(draggedItem);
    } else {
      grid.insertBefore(draggedItem, afterElement);
    }
    ordenacaoAlterada = true;
  });
}

function getDragAfterElement(container, x, y) {
  const draggableElements = [...container.querySelectorAll('.galeria-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offsetX = x - box.left - box.width / 2;
    const offsetY = y - box.top - box.height / 2;
    const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    
    if (offset < closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.POSITIVE_INFINITY }).element;
}

// Salvar nova ordem
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('#btn-ordenar-galeria');
  if (!btn) return;
  
  const grid = document.querySelector('#galeria-grid');
  if (!grid) return;
  
  const items = grid.querySelectorAll('.galeria-item');
  const storedFilenames = Array.from(items)
    .map(item => item.dataset.storedFilename)
    .filter(f => f);
  
  try {
    const res = await fetchWithAuth('/api/images/ordenar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storedFilenames)
    });
    
    if (!res.ok) {
      throw new Error('Erro ao salvar ordem');
    }
    
    ordenacaoAlterada = false;
    btn.classList.add('hidden');
    adicionarNotificacao('Ordem das imagens salva com sucesso', 'success');
  } catch (err) {
    LOG.error('[galeria] erro ao salvar ordem:', err);
    adicionarNotificacao('Erro ao salvar ordem: ' + err.message, 'error');
  }
});

export async function initGaleriaPage() {
  LOG.debug('[initGaleriaPage] inicializando página Galeria');
  const list = await fetchGalleryList();
  
  // Ordenar por ordemLanding
  list.sort((a, b) => {
    const ordemA = a.ordemLanding !== undefined ? a.ordemLanding : 999;
    const ordemB = b.ordemLanding !== undefined ? b.ordemLanding : 999;
    return ordemA - ordemB;
  });
  
  const grid = document.querySelector('#galeria-grid');
  if (grid) grid.innerHTML = '';
  list.forEach(item => inserirImagemGrid(item));
  
  setupDragAndDrop();
  
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

  const gal = document.getElementById('galeria');
  if (gal && !gal.classList.contains('hidden')) {
    LOG.debug('[observarGaleria] galeria já presente, inicializando');
    initGaleriaPage();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observarGaleria);
} else {
  observarGaleria();
}
