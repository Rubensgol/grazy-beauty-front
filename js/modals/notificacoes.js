// Sistema de notificações com histórico
let notificacoesHistorico = [];

export function adicionarNotificacao(texto, tipo = 'info') {
  try {
    // Toast rápido no canto inferior direito
    const id = 'app-toast';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.bottom = '16px';
      el.style.right = '16px';
      el.style.maxWidth = '360px';
      el.style.zIndex = '999999';
      document.body.appendChild(el);
    }
    const item = document.createElement('div');
    item.style.marginTop = '8px';
    item.style.padding = '10px 12px';
    item.style.borderRadius = '8px';
    item.style.background = tipo === 'success' ? '#e6ffed' : tipo === 'error' ? '#ffe6e6' : '#eef6ff';
    item.style.color = tipo === 'success' ? '#08660d' : tipo === 'error' ? '#8a0b0b' : '#08306b';
    item.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)';
    item.textContent = texto;
    el.appendChild(item);

    // Adicionar ao histórico
    notificacoesHistorico.unshift({
      texto,
      tipo,
      timestamp: new Date(),
      id: Date.now() + Math.random()
    });

    // Manter apenas últimas 20 notificações
    if (notificacoesHistorico.length > 20) {
      notificacoesHistorico = notificacoesHistorico.slice(0, 20);
    }

    // Atualizar badge de notificações
    atualizarBadgeNotificacoes();

    setTimeout(() => {
      item.style.transition = 'opacity .3s ease';
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 300);
    }, 2500);
  } catch {}
}

function atualizarBadgeNotificacoes() {
  const botaoNotificacoes = document.querySelector('.open-notificacoes');
  if (!botaoNotificacoes) return;

  let badge = botaoNotificacoes.querySelector('.notification-badge');
  if (!badge && notificacoesHistorico.length > 0) {
    badge = document.createElement('span');
    badge.className = 'notification-badge';
    badge.style.position = 'absolute';
    badge.style.top = '0';
    badge.style.right = '0';
    badge.style.backgroundColor = '#ef4444';
    badge.style.color = 'white';
    badge.style.borderRadius = '50%';
    badge.style.width = '20px';
    badge.style.height = '20px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = 'bold';
    botaoNotificacoes.style.position = 'relative';
    botaoNotificacoes.appendChild(badge);
  }

  if (badge) {
    if (notificacoesHistorico.length > 0) {
      badge.textContent = notificacoesHistorico.length > 9 ? '9+' : notificacoesHistorico.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function renderizarNotificacoes() {
  const lista = document.getElementById('notificacoes-list');
  if (!lista) return;

  if (notificacoesHistorico.length === 0) {
    lista.innerHTML = '<div class="text-center text-gray-500 py-8"><p class="text-sm">Nenhuma notificação por enquanto</p></div>';
    return;
  }

  lista.innerHTML = notificacoesHistorico.map(notif => {
    const tipoClass = notif.tipo === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                      notif.tipo === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                      'bg-blue-50 border-blue-200 text-blue-800';

    const íconeClass = notif.tipo === 'success' ? 'fa-check-circle text-green-500' :
                       notif.tipo === 'error' ? 'fa-exclamation-circle text-red-500' :
                       'fa-info-circle text-blue-500';

    const hora = notif.timestamp.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="p-3 border rounded-lg mb-2 ${tipoClass} flex gap-3">
        <div class="flex-shrink-0 pt-1">
          <i class="fas ${íconeClass}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">${notif.texto}</p>
          <p class="text-xs opacity-75 mt-1">${hora}</p>
        </div>
        <button onclick="removeNotificacao('${notif.id}')" class="flex-shrink-0 text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }).join('');
}

window.removeNotificacao = function(id) {
  notificacoesHistorico = notificacoesHistorico.filter(n => n.id !== id);
  renderizarNotificacoes();
  atualizarBadgeNotificacoes();
};

async function carregarModalNotificacoes() {
  try {
    const modal = document.getElementById('notificacoes-modal');
    if (!modal) {
      const res = await fetch('modals/notificacoes-modal.html?v=' + Date.now());
      if (!res.ok) throw new Error('Erro ao carregar modal');
      const html = await res.text();
      const container = document.getElementById('modals-container') || document.body;
      container.insertAdjacentHTML('beforeend', html);

      // Configurar eventos
      const botaoFechar = document.getElementById('notificacoes-modal-close');
      const botaoFecharBtn = document.getElementById('notificacoes-modal-close-btn');
      const botaoLimpar = document.getElementById('notificacoes-limpar');
      const novoModal = document.getElementById('notificacoes-modal');

      if (botaoFechar) {
        botaoFechar.addEventListener('click', () => {
          novoModal.classList.add('hidden');
        });
      }

      if (botaoFecharBtn) {
        botaoFecharBtn.addEventListener('click', () => {
          novoModal.classList.add('hidden');
        });
      }

      if (botaoLimpar) {
        botaoLimpar.addEventListener('click', () => {
          notificacoesHistorico = [];
          renderizarNotificacoes();
          atualizarBadgeNotificacoes();
        });
      }

      // Fechar ao clicar no overlay
      novoModal.addEventListener('click', (e) => {
        if (e.target === novoModal) {
          novoModal.classList.add('hidden');
        }
      });

      return novoModal;
    }
    return modal;
  } catch (err) {
    return null;
  }
}

function abrirModalNotificacoes() {
  carregarModalNotificacoes().then(modal => {
    if (!modal) return;
    renderizarNotificacoes();
    modal.classList.remove('hidden');
  });
}

// Inicializar ao carregar página
document.addEventListener('DOMContentLoaded', () => {
  const botaoNotificacoes = document.querySelector('.open-notificacoes');
  if (botaoNotificacoes) {
    botaoNotificacoes.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirModalNotificacoes();
    });
  }
});

// Se carregar após DOMContentLoaded
if (document.readyState !== 'loading') {
  const botaoNotificacoes = document.querySelector('.open-notificacoes');
  if (botaoNotificacoes && !botaoNotificacoes.__notificacoesSetup) {
    botaoNotificacoes.__notificacoesSetup = true;
    botaoNotificacoes.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirModalNotificacoes();
    });
  }
}
