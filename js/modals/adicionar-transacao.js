// Script para carregar e controlar o modal de adicionar/editar transação financeira
import { adicionarNotificacao } from './notificacoes.js';
import { buscarTransacoes, buscarValoresFinanceiros } from '../pages/financeiro.js';
import { fetchWithAuth } from '../configuracao/http.js';

export async function carregarModalTransacao() {
  const resp = await fetch('modals/adicionar-transacao.html');
  const html = await resp.text();
  document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);
  // Definir data atual como padrão
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('data-transacao').value = today;
  
  // Função para resetar o formulário para modo "adicionar"
  function resetarFormulario() {
    const titulo = document.getElementById('modal-transacao-titulo');
    const form = document.getElementById('form-adicionar-transacao');
    if (titulo) titulo.textContent = 'Adicionar Transação Financeira';
    if (form) {
      form.reset();
      document.getElementById('transacao-id').value = '';
      document.getElementById('data-transacao').value = today;
    }
  }
  
  // Eventos de abrir/fechar (delegado para funcionar com botões dinamicamente inseridos)
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest && e.target.closest('[data-open-transacao-modal], .financeiro-add-transacao');
    if (trigger) {
      resetarFormulario();
      const modal = document.getElementById('modal-adicionar-transacao');
      if (modal) modal.classList.remove('hidden');
    }
  });

  const closeBtn = document.getElementById('close-modal-adicionar-transacao');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    const modal = document.getElementById('modal-adicionar-transacao');
    if (modal) modal.classList.add('hidden');
    resetarFormulario();
  });
  
  // Botão cancelar
  const cancelBtn = document.getElementById('btn-cancelar-transacao');
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    const modal = document.getElementById('modal-adicionar-transacao');
    if (modal) modal.classList.add('hidden');
    resetarFormulario();
  });
  
  // Fechar ao clicar fora
  document.getElementById('modal-adicionar-transacao').addEventListener('click', (e) => {
    if (e.target.id === 'modal-adicionar-transacao') {
      e.currentTarget.classList.add('hidden');
      resetarFormulario();
    }
  });
  
  // Evento de submissão do formulário
  document.getElementById('form-adicionar-transacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');
    const isEdit = id && id.trim() !== '';
    
    const data = {
      data: formData.get('data'),
      descricao: formData.get('descricao'),
      tipo: formData.get('tipo'),
      valor: parseFloat(formData.get('valor'))
    };

    try {
      let response;
      
      if (isEdit) {
        // Modo edição - PUT
        response = await fetchWithAuth(`/api/transacoes/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
      } else {
        // Modo adicionar - POST
        response = await fetchWithAuth('/api/transacoes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
      }
      
      if (response.ok) {
        // Buscar transações e valores financeiros atualizados após adicionar/editar
        await buscarTransacoes();
        adicionarNotificacao(isEdit ? 'Transação atualizada com sucesso!' : 'Transação adicionada com sucesso!', 'success');
        document.getElementById('modal-adicionar-transacao').classList.add('hidden');
        // Limpar o formulário
        resetarFormulario();
      } else {
        adicionarNotificacao('Erro ao salvar transação: ' + response.statusText, 'error');
      }
    } catch (error) {
      adicionarNotificacao('Erro de conexão: ' + error.message, 'error');
    }
  });
}

// Carrega o modal ao abrir a página
window.addEventListener('DOMContentLoaded', carregarModalTransacao);