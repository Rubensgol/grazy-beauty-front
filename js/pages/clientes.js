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
  item.className = 'bg-white p-4 rounded-2xl shadow-md border border-gray-100 flex flex-col group relative transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-gray-200';
  const emailDisplay = c.email ? `<a href="mailto:${c.email}" class="hover:text-[var(--accent)] transition-colors" title="Enviar e-mail para ${c.email}">${c.email}</a>` : '<span class="text-gray-400">Não informado</span>';
  const telefoneDisplay = c.telefone ? `<a href="tel:${c.telefone}" class="hover:text-[var(--accent)] transition-colors" title="Ligar para ${c.telefone}">${c.telefone}</a>` : '<span class="text-gray-400">Não informado</span>';

  item.innerHTML = `
    <div class="flex-1">
      <h4 class="text-lg font-bold text-gray-800 mb-2 truncate transition-colors group-hover:text-[var(--accent)]" title="${c.nome}">${c.nome || 'Cliente sem nome'}</h4>
      <div class="space-y-2">
        <p class="text-sm text-gray-600 flex items-start gap-2">
          <i class="fas fa-envelope fa-fw text-gray-400 w-4 text-center pt-1"></i>
          <span>${emailDisplay}</span>
        </p>
        <p class="text-sm text-gray-600 flex items-start gap-2">
          <i class="fas fa-phone fa-fw text-gray-400 w-4 text-center pt-1"></i>
          <span>${telefoneDisplay}</span>
        </p>
      </div>
      ${c.obs ? `<div class="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 line-clamp-2"><i class="fas fa-sticky-note fa-fw text-gray-400 mr-1"></i>${c.obs}</div>` : ''}
    </div>
    <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
        <button class="btn-editar-cliente h-8 w-8 flex items-center justify-center rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors" data-id="${c.id}" title="Editar cliente">
            <i class="fas fa-pencil-alt text-xs"></i>
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
