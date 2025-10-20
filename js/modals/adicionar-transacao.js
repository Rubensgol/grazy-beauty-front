// Script para carregar e controlar o modal de adicionar transação financeira
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
  // Eventos de abrir/fechar (delegado para funcionar com botões dinamicamente inseridos)
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest && e.target.closest('[data-open-transacao-modal], .financeiro-add-transacao');
    if (trigger) {
      const modal = document.getElementById('modal-adicionar-transacao');
      if (modal) modal.classList.remove('hidden');
    }
  });

  const closeBtn = document.getElementById('close-modal-adicionar-transacao');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    const modal = document.getElementById('modal-adicionar-transacao');
    if (modal) modal.classList.add('hidden');
  });
  // Fechar ao clicar fora
  document.getElementById('modal-adicionar-transacao').addEventListener('click', (e) => {
    if (e.target.id === 'modal-adicionar-transacao') {
      e.currentTarget.classList.add('hidden');
    }
  });
  // Evento de submissão do formulário
  document.getElementById('form-adicionar-transacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      data: formData.get('data'),
      descricao: formData.get('descricao'),
      tipo: formData.get('tipo'),
      valor: parseFloat(formData.get('valor'))
    };

    try {
      const response = await fetchWithAuth('/api/transacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        // Buscar transações e valores financeiros atualizados após adicionar
        await buscarTransacoes();
        await buscarValoresFinanceiros();
        adicionarNotificacao('Transação adicionada com sucesso!', 'success');
        document.getElementById('modal-adicionar-transacao').classList.add('hidden');
        // Limpar o formulário
        e.target.reset();
        document.getElementById('data-transacao').value = today;
      } else {
        adicionarNotificacao('Erro ao adicionar transação: ' + response.statusText, 'error');
      }
    } catch (error) {
      adicionarNotificacao('Erro de conexão: ' + error.message, 'error');
    }
  });
}

// Carrega o modal ao abrir a página
window.addEventListener('DOMContentLoaded', carregarModalTransacao);