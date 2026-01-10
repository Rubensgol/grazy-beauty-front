// Script específico para a página Financeiro
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { fetchWithAuth } from '../configuracao/http.js';
import { LOG } from '../configuracao/logger.js';

// Função para buscar valores financeiros do endpoint
export async function buscarValoresFinanceiros() {
  LOG.info('💰 Buscando valores financeiros...');
  try {
    const response = await fetchWithAuth('/api/transacoes/valores');
    LOG.debug('📡 Resposta da API valores:', response.status);
    if (response.ok) {
      const json = await response.json();
      LOG.debug('✅ Valores financeiros recebidos:', json);
      // Extrair data do envelope ApiResposta se existir
      const valores = (json && json.data) ? json.data : json;
      atualizarValoresFinanceiros(valores);
    } else {
      adicionarNotificacao('Erro ao buscar valores financeiros: ' + response.statusText, 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao buscar valores financeiros:', error);
    adicionarNotificacao('Erro de conexão ao buscar valores financeiros: ' + error.message, 'error');
  }
}

// Função para atualizar os valores financeiros na interface
function atualizarValoresFinanceiros(valores) {
  // Atualizar receita total (compatibilidade com nomes 'receitaTotal' e 'receitasTotais')
  const receitaElement = document.getElementById('receita-total');
  const receitaValue = (valores.receitaTotal !== undefined) ? valores.receitaTotal : valores.receitasTotais;
  if (receitaElement && receitaValue !== undefined) {
    receitaElement.textContent = `R$ ${Number(receitaValue).toFixed(2).replace('.', ',')}`;
  }

  // Atualizar despesas totais (compatibilidade com nomes diferentes)
  const despesasElement = document.getElementById('despesas-totais');
  const despesasValue = (valores.despesasTotais !== undefined) ? valores.despesasTotais : valores.despesasTotal;
  if (despesasElement && despesasValue !== undefined) {
    despesasElement.textContent = `R$ ${Number(despesasValue).toFixed(2).replace('.', ',')}`;
  }

  // Atualizar lucro líquido
  const lucroElement = document.getElementById('lucro-liquido');
  if (lucroElement && valores.lucroLiquido !== undefined) {
    lucroElement.textContent = `R$ ${valores.lucroLiquido.toFixed(2).replace('.', ',')}`;
  }
}

// Função para buscar transações do endpoint
export async function buscarTransacoes() {
  LOG.info('🔄 Buscando transações...');
  try {
    const response = await fetchWithAuth('/api/transacoes');
    LOG.debug('📡 Resposta da API:', response.status);
    if (response.ok) {
      const json = await response.json();
      // Extrair data do envelope ApiResposta se existir
      const transacoes = (json && json.data) ? json.data : json;
      LOG.debug('✅ Transações recebidas:', Array.isArray(transacoes) ? transacoes.length : 0, 'itens');
      atualizarTabelaTransacoes(Array.isArray(transacoes) ? transacoes : []);
    } else {
      adicionarNotificacao('Erro ao buscar transações: ' + response.statusText, 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao buscar transações:', error);
    adicionarNotificacao('Erro de conexão ao buscar transações: ' + error.message, 'error');
  }
}

// Função para atualizar a tabela com as transações
function atualizarTabelaTransacoes(transacoes) {
  LOG.debug('📊 Atualizando tabela com', transacoes.length, 'transações');
  const tbody = document.querySelector('#financeiro tbody');
  LOG.debug('🎯 Elemento tbody encontrado:', !!tbody);
  if (!tbody) {
    LOG.warn('⚠️ Tabela não encontrada, página ainda não carregada');
    return; // Página ainda não carregada
  }

  tbody.innerHTML = ''; // Limpar tabela existente

  transacoes.forEach((data, index) => {
    const tr = document.createElement('tr');
    const dataFormatada = new Date(data.data).toLocaleDateString('pt-BR');
    const valorFormatado = data.tipo.toLowerCase() === 'despesa' ? `- R$ ${data.valor.toFixed(2)}` : `R$ ${data.valor.toFixed(2)}`;
    const tipoCor = data.tipo.toLowerCase() === 'receita' ? 'text-green-600' : 'text-red-600';
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">${dataFormatada}</td>
      <td class="px-6 py-4 whitespace-nowrap">${data.descricao}</td>
      <td class="px-6 py-4 whitespace-nowrap"><span class="${tipoCor}">${data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1).toLowerCase()}</span></td>
      <td class="px-6 py-4 whitespace-nowrap font-medium">${valorFormatado}</td>
    `;
    tbody.appendChild(tr);
  });
  LOG.info('✅ Tabela atualizada com sucesso');
}

// Função para adicionar transação à tabela (para compatibilidade)
export function adicionarTransacaoATabela(data) {
  const tbody = document.querySelector('#financeiro tbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  const dataFormatada = new Date(data.data).toLocaleDateString('pt-BR');
  const valorFormatado = data.tipo.toLowerCase() === 'despesa' ? `- R$ ${data.valor.toFixed(2)}` : `R$ ${data.valor.toFixed(2)}`;
  const tipoCor = data.tipo.toLowerCase() === 'receita' ? 'text-green-600' : 'text-red-600';
  tr.innerHTML = `
    <td class="px-6 py-4 whitespace-nowrap">${dataFormatada}</td>
    <td class="px-6 py-4 whitespace-nowrap">${data.descricao}</td>
    <td class="px-6 py-4 whitespace-nowrap"><span class="${tipoCor}">${data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1).toLowerCase()}</span></td>
    <td class="px-6 py-4 whitespace-nowrap font-medium">${valorFormatado}</td>
  `;
  tbody.insertBefore(tr, tbody.firstChild);
}

// Inicializar página financeiro quando carregada
export function initFinanceiroPage() {
  LOG.info('🚀 Inicializando página financeiro...');
  
  // Buscar valores financeiros quando a página for carregada
  buscarValoresFinanceiros();
  
  // Buscar transações quando a página for carregada
  buscarTransacoes();

  // Observar se há botão de adicionar transação na página
  const addButton = document.querySelector('.financeiro-add-transacao');
  if (addButton) {
    LOG.info('✅ Botão de adicionar transação encontrado');
    // O evento será tratado pelo modal de adicionar transação
    LOG.info('Página financeiro inicializada');
  } else {
    LOG.warn('⚠️ Botão de adicionar transação não encontrado');
  }
}

// Carregar automaticamente quando a página financeiro for carregada dinamicamente
window.addEventListener('DOMContentLoaded', () => {
  LOG.debug('📋 DOM carregado, configurando observação da página financeiro');
  
  // Observar quando a página financeiro for adicionada ao DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.id === 'financeiro') {
            console.log('🎯 Página financeiro detectada via MutationObserver');
            initFinanceiroPage();
          }
        });
      }
    });
  });

  const pagesContainer = document.getElementById('pages-container');
  if (pagesContainer) {
    LOG.info('✅ Container de páginas encontrado, iniciando observação');
    observer.observe(pagesContainer, { childList: true });
  } else {
    LOG.warn('⚠️ Container de páginas não encontrado');
  }

  // Verificar se a página já está carregada
  const paginaFinanceira = document.getElementById('financeiro');
  if (paginaFinanceira && !paginaFinanceira.classList.contains('hidden')) {
    LOG.info('🎯 Página financeiro já carregada e visível');
    initFinanceiroPage();
  } else {
    LOG.debug('ℹ️ Página financeiro não encontrada ou está oculta');
  }
});
