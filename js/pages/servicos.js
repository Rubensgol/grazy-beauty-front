import { carregarEAbrirModalServico, ensureServicoModalIsLoaded } from '../modals/servico-modal.js';
import { abrirConfirmacaoExclusao } from '../modals/confirmar-exclusao.js';
import { apiUrl } from '../configuracao/config.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { LOG } from '../configuracao/logger.js';
import { fetchWithAuth } from '../configuracao/http.js';

let servicosCache = [];

async function fetchServicos() {
  try {
    const res = await fetch(apiUrl('/api/servicos'));
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    const body = await res.json();
    if (Array.isArray(body)) return body; // lista direta
    if (body && Array.isArray(body.data)) return body.data; // envelope { success, data }
    return [];
  } catch (err) {
    adicionarNotificacao('Erro ao buscar serviços: ' + err.message, 'error');
    return [];
  }
}

function formatPreco(valor) {
  if (valor === null || valor === undefined || isNaN(Number(valor))) return 'R$ 0,00';
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

function limparGrid() {
  const grid = document.getElementById('servicos-grid');
  if (grid) grid.innerHTML = '';
}

function buildImageUrl(servico) {
  const stored = servico.imageStoredFilename || servico.storedFilename || servico.stored_filename;
  if (!stored) return null;
  return apiUrl(`/api/images/download/${encodeURIComponent(stored)}`);
}

function criarCardServico(servico) {
  const grid = document.getElementById('servicos-grid');
  if (!grid) return null;
  const nome = servico.nome || servico.nomeServico || '—';
  const preco = servico.preco !== undefined ? servico.preco : servico.valor;
  const descricao = servico.descricao || servico.description || '';
  
  // Formatar duração a partir de duracaoMinutos
  let duracao = '';
  if (servico.duracaoMinutos !== undefined && servico.duracaoMinutos !== null) {
    const minutosTotais = servico.duracaoMinutos;
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    
    if (horas > 0 && minutos > 0) {
      duracao = `${horas}h ${minutos}min`;
    } else if (horas > 0) {
      duracao = `${horas}h`;
    } else if (minutos > 0) {
      duracao = `${minutos}min`;
    }
  } else {
    // Fallback para duracao em string (padrão antigo)
    duracao = servico.duracao || servico.tempo || '';
  }
  
  const imgUrl = buildImageUrl(servico);
  const card = document.createElement('div');
  card.className = 'bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300 ease-in-out group flex flex-col';
  card.dataset.serviceId = servico.id || '';
  card.innerHTML = `
    <div class="relative bg-gradient-to-br from-gray-100 to-gray-200">
      <div class="w-full h-48 flex items-center justify-center overflow-hidden">
        ${imgUrl ? `<img src="${imgUrl}" alt="${nome}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">` : `<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`}
      </div>
      <div class="absolute top-3 right-3 flex gap-2">
        <button class="bg-[#b5879d] hover:bg-[#9f6b7f] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-editar-servico="${servico.id || ''}" title="Editar serviço">
          <i class="fas fa-edit"></i>
        </button>
        <button class="bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-deletar-servico="${servico.id || ''}" title="Excluir serviço">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="p-5 flex-grow flex flex-col">
      <h4 class="text-lg font-semibold text-gray-800 truncate font-playfair mb-2" title="${nome}">${nome}</h4>
      <p class="text-sm text-gray-600 mb-4 flex-grow line-clamp-3">${descricao || 'Sem descrição'}</p>
      <div class="border-t pt-4 flex justify-between items-end">
        <div class="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          <i class="fas fa-clock text-[#b5879d]"></i>
          <span>${duracao || 'N/A'}</span>
        </div>
        <span class="text-2xl font-bold text-[#b5879d]">${formatPreco(preco)}</span>
      </div>
    </div>`;
  return card;
}

function inserirCardServico(servico) {
  const grid = document.getElementById('servicos-grid');
  if (!grid) return;
  const card = criarCardServico(servico);
  if (card) grid.appendChild(card);
}

function atualizarCardServico(servico) {
  const grid = document.getElementById('servicos-grid');
  if (!grid) return;
  const existing = grid.querySelector(`[data-service-id="${servico.id}"]`);
  const novo = criarCardServico(servico);
  if (!novo) return;
  if (existing) {
    existing.replaceWith(novo);
  } else {
    grid.appendChild(novo);
  }
}

async function carregarListaServicos() {
  const grid = document.getElementById('servicos-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="col-span-full text-sm text-gray-500">Carregando...</div>`;
  const lista = await fetchServicos();
  limparGrid();
  if (!lista.length) {
    grid.innerHTML = `<div class="col-span-full text-sm text-gray-500">Nenhum serviço cadastrado</div>`;
    return;
  }
  servicosCache = lista;
  lista.forEach(s => inserirCardServico(s));
}

export function initServicosPage() {
  carregarListaServicos();
  const openServicoModalBtn = document.getElementById('open-servico-modal-button');
  if (openServicoModalBtn && !openServicoModalBtn.dataset.listenerAttached) {
    openServicoModalBtn.addEventListener('click', carregarEAbrirModalServico);
    openServicoModalBtn.dataset.listenerAttached = 'true';
  }
}

// Inserção incremental sem recarregar tudo
window.addEventListener('servico:adicionado', (e) => {
  const detail = e.detail && e.detail.data ? e.detail.data : e.detail;
  if (!detail) return carregarListaServicos();
  // Atualiza cache e DOM
  const idx = servicosCache.findIndex(s => String(s.id) === String(detail.id));
  if (idx >= 0) servicosCache[idx] = detail; else servicosCache.push(detail);
  atualizarCardServico(detail);
});

window.addEventListener('servico:atualizado', (e) => {
  const detail = e.detail && e.detail.data ? e.detail.data : e.detail;
  if (!detail) return;
  const idx = servicosCache.findIndex(s => String(s.id) === String(detail.id));
  if (idx >= 0) servicosCache[idx] = { ...servicosCache[idx], ...detail }; else servicosCache.push(detail);
  atualizarCardServico(detail);
});

// Carregar serviços quando a página for exibida
window.addEventListener('page:shown', (e) => {
  if (e.detail.page !== 'servicos') return;
  LOG.debug('[servicos] page:shown — carregando serviços');
  carregarListaServicos();
});

// Também tenta carregar após o HTML ser inserido
window.addEventListener('page:loaded', (e) => {
  if (e.detail.page !== 'servicos') return;
  LOG.debug('[servicos] page:loaded — preparando DOM');
});

window.addEventListener('DOMContentLoaded', () => {
  const pagesContainer = document.getElementById('pages-container');
  if (pagesContainer) {
    const observer = new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => { if (n.id === 'servicos') initServicosPage(); }));
    });
    observer.observe(pagesContainer, { childList: true });
  }
  const pagina = document.getElementById('servicos');
  if (pagina && !pagina.classList.contains('hidden')) initServicosPage();
  
  // Delegated click para editar
  document.addEventListener('click', async (e) => {
    const btnEditar = e.target.closest && e.target.closest('[data-editar-servico]');
    if (btnEditar) {
      const id = btnEditar.getAttribute('data-editar-servico');
      if (!id) return;

      await ensureServicoModalIsLoaded();

      const servico = servicosCache.find(s => String(s.id) === String(id));
      if (!servico) {
        adicionarNotificacao('Serviço não encontrado no cache', 'error');
        return;
      }
      // Dispara evento para o modal preencher
      window.dispatchEvent(new CustomEvent('servico:editar', { detail: servico }));
    }

    // Delegated click para deletar
    const btnDeletar = e.target.closest && e.target.closest('[data-deletar-servico]');
    if (btnDeletar) {
      const id = btnDeletar.getAttribute('data-deletar-servico');
      if (!id) return;
      
      // Abre modal de confirmação com callback
      abrirConfirmacaoExclusao(id, async (servicoId) => {
        try {
          LOG.debug('[servicos] excluindo serviço:', servicoId);
          const res = await fetchWithAuth(apiUrl(`/api/servicos/${servicoId}`), {
            method: 'DELETE'
          });

          LOG.debug('[servicos] resposta delete:', res.status);

          if (!res.ok) {
            const json = await res.json().catch(() => null);
            throw new Error(json?.message || `Status ${res.status}`);
          }

          // Remove do cache
          servicosCache = servicosCache.filter(s => String(s.id) !== String(servicoId));
          
          // Remove do DOM
          const grid = document.getElementById('servicos-grid');
          if (grid) {
            const card = grid.querySelector(`[data-service-id="${servicoId}"]`);
            if (card) card.remove();
            
            // Se ficou vazio, mostrar mensagem
            if (servicosCache.length === 0) {
              grid.innerHTML = `<div class="col-span-full text-sm text-gray-500">Nenhum serviço cadastrado</div>`;
            }
          }

          adicionarNotificacao('Serviço excluído com sucesso', 'success');
        } catch (err) {
          LOG.error('[servicos] erro ao excluir:', err);
          adicionarNotificacao('Erro ao excluir serviço: ' + err.message, 'error');
        }
      });
    }
  });
});
