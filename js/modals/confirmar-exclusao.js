import { LOG } from '../configuracao/logger.js';

let servicoIdParaExcluir = null;
let callbackExcluir = null;

// Carrega o modal HTML
async function ensureConfirmacaoModalIsLoaded() {
  if (document.getElementById('modal-confirmar-exclusao')) {
    return;
  }

  try {
    LOG.debug('[confirmar-exclusao] carregando HTML do modal');
    const resp = await fetch('modals/confirmar-exclusao.html');
    const html = await resp.text();
    
    let container = document.getElementById('modals-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modals-container';
      document.body.appendChild(container);
    }
    
    container.insertAdjacentHTML('beforeend', html);
    LOG.debug('[confirmar-exclusao] wireando modal');
    wireConfirmacaoModal();
  } catch (e) {
    LOG.error('[confirmar-exclusao] Erro ao carregar:', e);
    throw e;
  }
}

function wireConfirmacaoModal() {
  const modal = document.getElementById('modal-confirmar-exclusao');
  const btnCancelar = document.getElementById('btn-cancelar-exclusao');
  const btnConfirmar = document.getElementById('btn-confirmar-exclusao');

  if (!modal) {
    LOG.error('[confirmar-exclusao] modal não encontrado');
    return;
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.style.zIndex = '';
      servicoIdParaExcluir = null;
      callbackExcluir = null;
    }, 300);
  }

  // Botão cancelar
  if (btnCancelar) {
    btnCancelar.addEventListener('click', closeModal);
  }

  // Click fora do modal
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Botão confirmar exclusão
  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', async () => {
      if (!servicoIdParaExcluir || !callbackExcluir) {
        LOG.error('[confirmar-exclusao] ID ou callback não definido');
        closeModal();
        return;
      }

      try {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Excluindo...';
        
        LOG.debug('[confirmar-exclusao] executando callback de exclusão');
        await callbackExcluir(servicoIdParaExcluir);

        closeModal();
      } catch (err) {
        LOG.error('[confirmar-exclusao] erro na exclusão:', err);
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Excluir';
      }
    });
  }
}

export async function abrirConfirmacaoExclusao(servicoId, callback) {
  await ensureConfirmacaoModalIsLoaded();
  
  servicoIdParaExcluir = servicoId;
  callbackExcluir = callback;

  const modal = document.getElementById('modal-confirmar-exclusao');
  if (!modal) {
    LOG.error('[confirmar-exclusao] modal não encontrado após load');
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

export function fecharConfirmacaoExclusao() {
  const modal = document.getElementById('modal-confirmar-exclusao');
  if (!modal) return;
  
  modal.classList.add('opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.style.zIndex = '';
    servicoIdParaExcluir = null;
    callbackExcluir = null;
  }, 300);
}
