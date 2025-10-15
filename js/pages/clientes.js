import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { LOG } from '../configuracao/logger.js';

// Busca e renderiza todos os clientes
export async function listarClientes() {
  const listaClientesEl = document.getElementById('lista-clientes');
  if (!listaClientesEl) {
    LOG.error('[listarClientes] elemento de lista não encontrado');
    return;
  }

  listaClientesEl.innerHTML = '';
  try {
    LOG.debug('[listarClientes] iniciando fetch de /api/cliente');
    const res = await fetchWithAuth('/api/cliente');
    LOG.debug('[listarClientes] resposta status', res.status);
    
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }

    const json = await res.json();
    LOG.debug('[listarClientes] dados recebidos', json);
    
    let lista = [];
    if (json && json.success && Array.isArray(json.data)) {
      lista = json.data;
    } else if (Array.isArray(json)) {
      lista = json;
    }

    LOG.debug('[listarClientes] renderizando', lista.length, 'cliente(s)');
    const emptyEl = document.getElementById('clientes-empty');
    if (emptyEl) emptyEl.classList.add('hidden');
    lista.forEach(renderizarCliente);
    
    if (lista.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
    }
  } catch (err) {
    LOG.error('[listarClientes] erro', err);
    adicionarNotificacao('Erro ao carregar clientes: ' + err.message, 'error');
  }
}

export function normalizarCliente(c = {}) {
  if (!c || typeof c !== 'object') return {};
  const id = c.id || c.idUsuario || c.id_usuario || c.usuarioId || null;
  const nome = c.nome || c.nomeUsuario || c.nome_usuario || c.name || '';
  const email = c.email || c.mail || c.emailUsuario || '';
  const telefone = c.telefone || c.fone || c.celular || null;
  const obs = c.obs || c.observacoes || c.observacao || null;
  return { ...c, id, nome, email, telefone, obs };
}

// Renderiza um cliente na lista
function renderizarCliente(cliente) {
  const listaClientesEl = document.getElementById('lista-clientes');
  if (!listaClientesEl) return;
  const c = normalizarCliente(cliente);
  let item = document.createElement('div');
  item.className = 'cliente-item bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-md hover:shadow-lg transition-shadow';
  item.innerHTML = `
    <div class="flex justify-between items-start">
      <div class="flex-1">
        <h4 class="text-lg font-semibold text-gray-800 mb-2">${c.nome}</h4>
        <p class="text-gray-600 mb-1"><i class="fas fa-envelope mr-2"></i>${c.email}</p>
        <p class="text-gray-600 mb-1"><i class="fas fa-phone mr-2"></i>${c.telefone || 'N/A'}</p>
        ${c.obs ? `<p class="text-gray-600 mb-1"><i class="fas fa-sticky-note mr-2"></i>${c.obs}</p>` : ''}
      </div>
      <button class="btn-editar-cliente text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors" data-id="${c.id}" title="Editar cliente">
        <i class="fas fa-edit"></i>
      </button>
    </div>
  `;
  item.querySelector('.btn-editar-cliente').addEventListener('click', async () => {
    try {
      const { carregarEAbrirModalCliente } = await import('../modals/cliente-modal.js');
      await carregarEAbrirModalCliente();
    } catch {}
    window.dispatchEvent(new CustomEvent('cliente:editar', { detail: c }));
  });
  listaClientesEl.appendChild(item);
}

// Abrir modal ao clicar no botão (delegado)
document.addEventListener('click', async (e) => {
  const trigger = e.target.closest && e.target.closest('#open-cliente-modal-button, .open-cliente-modal-button');
  if (!trigger) return;
  LOG.debug('[clientes] clique em abrir modal');
  const { carregarEAbrirModalCliente } = await import('../modals/cliente-modal.js');
  carregarEAbrirModalCliente();
});

// Inicializar quando a página é exibida
window.addEventListener('page:shown', async e => {
  if (e.detail.page !== 'clientes') return;
  LOG.debug('[clientes] page:shown — carregando clientes');
  listarClientes();
});

// Também tenta carregar após o HTML ser inserido
window.addEventListener('page:loaded', async (e) => {
  if (e.detail.page !== 'clientes') return;
  LOG.debug('[clientes] page:loaded — preparando DOM');
  // não lista aqui para evitar duplicar; o page:shown já fará.
});

// Atualiza lista ao adicionar/editar cliente
window.addEventListener('cliente:adicionado', (ev) => {
  LOG.debug('[clientes] cliente:adicionado — recarregando lista');
  listarClientes();
});
window.addEventListener('cliente:atualizado', (ev) => {
  LOG.debug('[clientes] cliente:atualizado — recarregando lista');
  listarClientes();
});
