
import { LOG } from '../configuracao/logger.js';

let modalLoaded = false;
let confirmCallback = null;
let cancelCallback = null;

/**
 * Carrega o modal HTML uma única vez
 */
async function carregarModalConfirmacao() {
  if (modalLoaded) return;

  try {
    const res = await fetch('modals/confirmar-acao.html?v=' + Date.now());
    if (!res.ok) throw new Error('Erro ao carregar modal');
    const html = await res.text();
    const container = document.getElementById('modals-container') || document.body;
    container.insertAdjacentHTML('beforeend', html);

    const modal = document.getElementById('modal-confirmar-acao');
    const btnConfirmar = document.getElementById('modal-confirmar');
    const btnCancelar = document.getElementById('modal-cancelar');

    if (btnConfirmar) {
      btnConfirmar.addEventListener('click', () => {
        if (confirmCallback) {
          confirmCallback();
        }
        fecharModal();
      });
    }

    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        if (cancelCallback) {
          cancelCallback();
        }
        fecharModal();
      });
    }

    // Fechar ao clicar no backdrop
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (cancelCallback) {
            cancelCallback();
          }
          fecharModal();
        }
      });

      // Fechar com ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
          if (cancelCallback) {
            cancelCallback();
          }
          fecharModal();
        }
      });
    }

    modalLoaded = true;
    LOG.debug('[confirmar-acao] modal carregado com sucesso');
  } catch (err) {
    LOG.error('[confirmar-acao] erro ao carregar modal', err);
  }
}

/**
 * Abre o modal com mensagem e callbacks customizados
 * @param {string} titulo - Título do modal
 * @param {string} mensagem - Mensagem de confirmação
 * @param {function} onConfirm - Callback ao confirmar
 * @param {function} onCancel - Callback ao cancelar (opcional)
 * @param {string} tipo - Tipo de ação: 'delete', 'warning', 'info' (padrão: 'delete')
 */
export async function mostrarConfirmacao(titulo, mensagem, onConfirm, onCancel, tipo = 'delete') {
  await carregarModalConfirmacao();

  const modal = document.getElementById('modal-confirmar-acao');
  if (!modal) return;

  // Atualizar conteúdo
  const modalTitulo = document.getElementById('modal-titulo');
  const modalMensagem = document.getElementById('modal-mensagem');
  const modalIcone = document.getElementById('modal-icone');
  const btnConfirmar = document.getElementById('modal-confirmar');

  if (modalTitulo) modalTitulo.textContent = titulo;
  if (modalMensagem) modalMensagem.textContent = mensagem;

  // Atualizar icone e cor baseado no tipo
  if (modalIcone) {
    if (tipo === 'delete') {
      modalIcone.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center';
      modalIcone.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>';
    } else if (tipo === 'warning') {
      modalIcone.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center';
      modalIcone.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4v2m0 0v2m0-2H9m0 0v-2M9 9v2m4-4v2" /></svg>';
    } else if (tipo === 'info') {
      modalIcone.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center';
      modalIcone.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    }
  }

  // Atualizar cor do botão confirmar
  if (btnConfirmar) {
    if (tipo === 'delete') {
      btnConfirmar.className = 'px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200';
      btnConfirmar.textContent = 'Excluir';
    } else if (tipo === 'warning') {
      btnConfirmar.className = 'px-4 py-2.5 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors duration-200';
      btnConfirmar.textContent = 'Confirmar';
    } else if (tipo === 'info') {
      btnConfirmar.className = 'px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200';
      btnConfirmar.textContent = 'Continuar';
    }
  }

  // Guardar callbacks
  confirmCallback = onConfirm;
  cancelCallback = onCancel;

  // Abrir modal com animação
  modal.classList.remove('hidden');
  // Trigger reflow para ativar transição CSS
  void modal.offsetWidth;

  LOG.debug('[confirmar-acao] modal aberto', { titulo, tipo });
}

/**
 * Versão simples: retorna Promise que resolve para true/false
 * @param {string} titulo
 * @param {string} mensagem
 * @param {string} tipo
 * @returns {Promise<boolean>}
 */
export function confirmarAcao(titulo, mensagem, tipo = 'delete') {
  return new Promise((resolve) => {
    mostrarConfirmacao(
      titulo,
      mensagem,
      () => resolve(true),
      () => resolve(false),
      tipo
    );
  });
}

/**
 * Fecha o modal
 */
function fecharModal() {
  const modal = document.getElementById('modal-confirmar-acao');
  if (modal) {
    modal.classList.add('hidden');
  }
  confirmCallback = null;
  cancelCallback = null;
}

/**
 * COMPATIBILIDADE COM ANTIGO confirmar-exclusao.js
 * Wrapper para uso com callback (padrão antigo)
 * @param {string|number} servicoId - ID do item a excluir
 * @param {function} callback - Função a executar ao confirmar
 */
export async function abrirConfirmacaoExclusao(servicoId, callback) {
  return new Promise((resolve) => {
    mostrarConfirmacao(
      'Excluir item',
      'Esta ação não pode ser desfeita. Tem certeza que deseja remover este item permanentemente?',
      () => {
        callback(servicoId).then(resolve).catch(resolve);
      },
      () => resolve(false),
      'delete'
    );
  });
}

/**
 * COMPATIBILIDADE - Fechar modal antigo
 */
export function fecharConfirmacaoExclusao() {
  fecharModal();
}

// Inicializar ao carregar página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', carregarModalConfirmacao);
} else {
  carregarModalConfirmacao();
}
