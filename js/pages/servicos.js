import { carregarEAbrirModalServico, ensureServicoModalIsLoaded } from '../modals/servico-modal.js';
import { abrirConfirmacaoExclusao } from '../modals/confirmar-acao.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { LOG } from '../configuracao/logger.js';
import { fetchWithAuth } from '../configuracao/http.js';
import { apiUrl } from '../configuracao/config.js';

let servicosCache = [];

async function fetchServicos() {
  try {
    const res = await fetchWithAuth('/api/servicos/todos');
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
  if (!stored || stored === '' || stored === 'null' || stored === 'undefined') {
    LOG.debug('[buildImageUrl] imagem não disponível para serviço:', servico.id || servico.nome);
    return null;
  }
  return `/api/images/download/${encodeURIComponent(stored)}`;
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
  
  const baseImgUrl = buildImageUrl(servico);
  const imgUrl = baseImgUrl ? apiUrl(baseImgUrl) : null;
  
  // Placeholder SVG para erro de carregamento
  const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Cpath fill="%23d1d5db" d="M150 100h100v80h-100z"/%3E%3Ccircle cx="180" cy="130" r="10" fill="%23e5e7eb"/%3E%3Cpath fill="%23d1d5db" d="M150 160l30-20 20 15 30-10v25h-80z"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="220" text-anchor="middle"%3ESem imagem%3C/text%3E%3C/svg%3E';
  
  const isAtivo = servico.ativo !== false && servico.ativo !== 0;
  
  const card = document.createElement('div');
  card.className = `bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300 ease-in-out group flex flex-col cursor-move ${!isAtivo ? 'opacity-60 grayscale' : ''}`;
  card.dataset.serviceId = servico.id || '';
  card.dataset.ativo = isAtivo ? 'true' : 'false';
  card.draggable = true;
  card.innerHTML = `
    <div class="relative bg-gradient-to-br from-gray-100 to-gray-200">
      <div class="w-full h-48 flex items-center justify-center overflow-hidden">
        ${imgUrl ? `<img src="${imgUrl}" alt="${nome}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.onerror=null; this.src='${placeholderSvg}'; this.classList.remove('object-cover', 'group-hover:scale-110'); this.classList.add('object-contain', 'opacity-50');">` : `<img src="${placeholderSvg}" alt="Sem imagem" class="w-full h-full object-contain opacity-50">`}
      </div>
      ${!isAtivo ? '<div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><span class="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm uppercase">Inativo</span></div>' : ''}
      <div class="absolute top-3 right-3 flex gap-2">
        <button class="bg-[#b5879d] hover:bg-[#9f6b7f] text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-editar-servico="${servico.id || ''}" title="Editar serviço">
          <i class="fas fa-edit"></i>
        </button>
        ${!isAtivo ? `<button class="bg-green-500 hover:bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-ativar-servico="${servico.id || ''}" title="Ativar serviço">
          <i class="fas fa-check"></i>
        </button>` : ''}
        <button class="bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" data-deletar-servico="${servico.id || ''}" title="${isAtivo ? 'Excluir serviço' : 'Serviço já inativo'}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="absolute top-3 left-3 bg-gray-800 bg-opacity-70 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" title="Arrastar para reordenar">
        <i class="fas fa-grip-vertical text-sm"></i>
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
  
  // Aplicar ordem salva, se existir
  let listaOrdenada = [...lista];
  try {
    const ordemSalva = localStorage.getItem('servicos-ordem');
    if (ordemSalva) {
      const ordem = JSON.parse(ordemSalva);
      LOG.debug('[servicos] Aplicando ordem salva:', ordem);
      
      // Reordenar lista baseado na ordem salva
      listaOrdenada = ordem
        .map(id => lista.find(s => String(s.id) === String(id)))
        .filter(s => s !== undefined);
      
      // Adicionar serviços novos que não estão na ordem salva
      const idsOrdenados = ordem.map(String);
      lista.forEach(servico => {
        if (!idsOrdenados.includes(String(servico.id))) {
          listaOrdenada.push(servico);
        }
      });
    }
  } catch (e) {
    LOG.warn('[servicos] Erro ao aplicar ordem salva:', e);
    listaOrdenada = lista;
  }
  
  servicosCache = listaOrdenada;
  listaOrdenada.forEach(inserirCardServico);
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

    // Delegated click para ativar
    const btnAtivar = e.target.closest && e.target.closest('[data-ativar-servico]');
    if (btnAtivar) {
      const id = btnAtivar.getAttribute('data-ativar-servico');
      if (!id) return;
      
      try {
        LOG.debug('[servicos] ativando serviço:', id);
        const res = await fetchWithAuth(`/api/servicos/${id}/ativar`, {
          method: 'PUT'
        });

        LOG.debug('[servicos] resposta ativar:', res.status);

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message || `Status ${res.status}`);
        }

        // Pegar resposta do backend
        const responseData = await res.json().catch(() => null);
        const mensagem = responseData?.message || responseData?.msg || 'Serviço ativado com sucesso';

        LOG.debug('[servicos] resposta do backend:', responseData);

        // Atualizar status no cache
        const servicoNoCache = servicosCache.find(s => String(s.id) === String(id));
        if (servicoNoCache) {
          servicoNoCache.ativo = true;
          atualizarCardServico(servicoNoCache);
        } else {
          // Se não está no cache, recarregar
          await carregarListaServicos();
        }

        // Mostrar mensagem retornada pelo backend
        adicionarNotificacao(mensagem, 'success');
      } catch (err) {
        LOG.error('[servicos] erro ao ativar:', err);
        adicionarNotificacao('Erro ao ativar serviço: ' + err.message, 'error');
      }
    }

    // Delegated click para deletar
    const btnDeletar = e.target.closest && e.target.closest('[data-deletar-servico]');
    if (btnDeletar) {
      const id = btnDeletar.getAttribute('data-deletar-servico');
      if (!id) return;
      
      // Abre modal de confirmação com callback (padrão unificado)
      abrirConfirmacaoExclusao(id, async (servicoId) => {
        try {
          LOG.debug('[servicos] excluindo/desativando serviço:', servicoId);
          const res = await fetchWithAuth(`/api/servicos/${servicoId}`, {
            method: 'DELETE'
          });

          LOG.debug('[servicos] resposta delete:', res.status);

          if (!res.ok) {
            const json = await res.json().catch(() => null);
            throw new Error(json?.message || `Status ${res.status}`);
          }

          // Pegar resposta do backend
          const responseData = await res.json().catch(() => null);
          const mensagem = responseData?.message || responseData?.msg || 'Operação realizada com sucesso';
          const foiExcluido = responseData?.deleted === true || mensagem.toLowerCase().includes('excluído');
          const foiDesativado = responseData?.deactivated === true || mensagem.toLowerCase().includes('desativado');

          LOG.debug('[servicos] resposta do backend:', responseData);

          if (foiExcluido) {
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
          } else if (foiDesativado) {
            // Atualizar status no cache
            const servicoNoCache = servicosCache.find(s => String(s.id) === String(servicoId));
            if (servicoNoCache) {
              servicoNoCache.ativo = false;
              atualizarCardServico(servicoNoCache);
            }
          } else {
            // Recarregar lista para refletir mudanças
            await carregarListaServicos();
          }

          // Mostrar mensagem retornada pelo backend
          adicionarNotificacao(mensagem, 'success');
        } catch (err) {
          LOG.error('[servicos] erro ao excluir/desativar:', err);
          adicionarNotificacao('Erro ao processar serviço: ' + err.message, 'error');
        }
      });
    }
  });

  // ===== Sistema de Drag and Drop para reordenar serviços =====
  let draggedElement = null;

  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('[data-service-id]');
    if (!card) return;
    
    draggedElement = card;
    card.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragend', (e) => {
    const card = e.target.closest('[data-service-id]');
    if (!card) return;
    
    card.style.opacity = '1';
    draggedElement = null;
    
    // Remover indicadores visuais
    document.querySelectorAll('[data-service-id]').forEach(c => {
      c.classList.remove('border-t-4', 'border-[#b5879d]');
    });
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    const card = e.target.closest('[data-service-id]');
    if (!card || card === draggedElement) return;
    
    e.dataTransfer.dropEffect = 'move';
    
    // Indicador visual de onde vai soltar
    document.querySelectorAll('[data-service-id]').forEach(c => {
      c.classList.remove('border-t-4', 'border-[#b5879d]');
    });
    card.classList.add('border-t-4', 'border-[#b5879d]');
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetCard = e.target.closest('[data-service-id]');
    if (!targetCard || !draggedElement || targetCard === draggedElement) return;
    
    const grid = document.getElementById('servicos-grid');
    if (!grid) return;
    
    // Determinar posição relativa
    const rect = targetCard.getBoundingClientRect();
    const mouseY = e.clientY;
    const targetMiddle = rect.top + rect.height / 2;
    
    // Inserir antes ou depois
    if (mouseY < targetMiddle) {
      grid.insertBefore(draggedElement, targetCard);
    } else {
      grid.insertBefore(draggedElement, targetCard.nextSibling);
    }
    
    // Remover indicador visual
    targetCard.classList.remove('border-t-4', 'border-[#b5879d]');
    
    // Atualizar ordem no array e salvar
    atualizarOrdemServicos();
  });

  async function atualizarOrdemServicos() {
    const grid = document.getElementById('servicos-grid');
    if (!grid) return;
    
    const cards = Array.from(grid.querySelectorAll('[data-service-id]'));
    const novaOrdem = cards.map(card => parseInt(card.dataset.serviceId));
    
    LOG.debug('[servicos] Nova ordem:', novaOrdem);
    
    // Salvar no localStorage
    try {
      localStorage.setItem('servicos-ordem', JSON.stringify(novaOrdem));
    } catch (e) {
      LOG.warn('[servicos] Erro ao salvar ordem no localStorage:', e);
    }
    
    // Enviar ao backend
    try {
      LOG.info('[servicos] Enviando nova ordem ao backend...');
      const response = await fetchWithAuth('/api/servicos/ordenacao', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: novaOrdem })
      });
      
      if (response.ok) {
        LOG.info('[servicos] Ordem atualizada no backend com sucesso');
        adicionarNotificacao('Ordem dos serviços atualizada', 'success');
      } else {
        const errorText = await response.text().catch(() => response.statusText);
        LOG.error('[servicos] Erro ao atualizar ordem no backend:', response.status, errorText);
        adicionarNotificacao('Erro ao salvar ordem no servidor', 'error');
      }
    } catch (error) {
      LOG.error('[servicos] Erro ao enviar ordem ao backend:', error);
      adicionarNotificacao('Erro de conexão ao salvar ordem', 'error');
    }
  }
});
