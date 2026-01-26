// Script específico para a página Financeiro
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { fetchWithAuth } from '../configuracao/http.js';
import { LOG } from '../configuracao/logger.js';

// Estado global do módulo
let todasTransacoes = [];
let filtroAtual = 'todos';
let dataFiltro = new Date();

// Função para buscar valores financeiros do endpoint
export async function buscarValoresFinanceiros(periodo = null, data = null) {
  LOG.info('💰 Buscando valores financeiros...');
  try {
    let url = '/api/transacoes/valores';
    if (periodo && periodo !== 'todos') {
      const params = new URLSearchParams();
      params.append('periodo', periodo);
      if (data) {
        params.append('data', data.toISOString().split('T')[0]);
      }
      url += '?' + params.toString();
    }
    
    const response = await fetchWithAuth(url);
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
      todasTransacoes = Array.isArray(transacoes) ? transacoes : [];
      aplicarFiltro();
    } else {
      adicionarNotificacao('Erro ao buscar transações: ' + response.statusText, 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao buscar transações:', error);
    adicionarNotificacao('Erro de conexão ao buscar transações: ' + error.message, 'error');
  }
}

// Função para filtrar transações
function filtrarTransacoes(transacoes, periodo, data) {
  if (periodo === 'todos') return transacoes;
  
  const dataRef = data || new Date();
  
  return transacoes.filter(t => {
    const dataTransacao = new Date(t.data);
    
    switch (periodo) {
      case 'dia':
        return dataTransacao.toDateString() === dataRef.toDateString();
      case 'mes':
        return dataTransacao.getMonth() === dataRef.getMonth() && 
               dataTransacao.getFullYear() === dataRef.getFullYear();
      case 'ano':
        return dataTransacao.getFullYear() === dataRef.getFullYear();
      default:
        return true;
    }
  });
}

// Aplicar filtro atual
function aplicarFiltro() {
  const transacoesFiltradas = filtrarTransacoes(todasTransacoes, filtroAtual, dataFiltro);
  atualizarTabelaTransacoes(transacoesFiltradas);
  
  // Calcular totais filtrados
  const receitas = transacoesFiltradas.filter(t => t.tipo.toLowerCase() === 'receita')
    .reduce((sum, t) => sum + t.valor, 0);
  const despesas = transacoesFiltradas.filter(t => t.tipo.toLowerCase() === 'despesa')
    .reduce((sum, t) => sum + t.valor, 0);
  const lucro = receitas - despesas;
  
  atualizarValoresFinanceiros({
    receitaTotal: receitas,
    despesasTotais: despesas,
    lucroLiquido: lucro
  });
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

  if (transacoes.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="5" class="px-6 py-8 text-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Nenhuma transação encontrada para o período selecionado
      </td>
    `;
    tbody.appendChild(tr);
    return;
  }

  transacoes.forEach((data, index) => {
    const tr = document.createElement('tr');
    tr.classList.add('hover:bg-gray-50', 'transition-colors');
    const dataFormatada = new Date(data.data).toLocaleDateString('pt-BR');
    const valorFormatado = data.tipo.toLowerCase() === 'despesa' ? `- R$ ${data.valor.toFixed(2)}` : `R$ ${data.valor.toFixed(2)}`;
    const tipoCor = data.tipo.toLowerCase() === 'receita' ? 'text-green-600' : 'text-red-600';
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">${dataFormatada}</td>
      <td class="px-6 py-4 whitespace-nowrap">${data.descricao}</td>
      <td class="px-6 py-4 whitespace-nowrap"><span class="${tipoCor}">${data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1).toLowerCase()}</span></td>
      <td class="px-6 py-4 whitespace-nowrap font-medium">${valorFormatado}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center gap-2">
          <button class="btn-editar-transacao text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors" data-id="${data.id}" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button class="btn-excluir-transacao text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors" data-id="${data.id}" title="Excluir">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Adicionar eventos aos botões
  configurarBotoesTransacao();
  
  LOG.info('✅ Tabela atualizada com sucesso');
}

// Configurar botões de editar e excluir
function configurarBotoesTransacao() {
  // Botões de editar
  document.querySelectorAll('.btn-editar-transacao').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const transacao = todasTransacoes.find(t => t.id == id);
      if (transacao) {
        abrirModalEditar(transacao);
      }
    });
  });
  
  // Botões de excluir
  document.querySelectorAll('.btn-excluir-transacao').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      if (confirm('Tem certeza que deseja excluir esta transação?')) {
        await excluirTransacao(id);
      }
    });
  });
}

// Abrir modal para editar transação
export function abrirModalEditar(transacao) {
  const modal = document.getElementById('modal-adicionar-transacao');
  const titulo = document.getElementById('modal-transacao-titulo');
  const form = document.getElementById('form-adicionar-transacao');
  
  if (!modal || !form) return;
  
  // Atualizar título
  if (titulo) titulo.textContent = 'Editar Transação';
  
  // Preencher formulário
  document.getElementById('transacao-id').value = transacao.id;
  document.getElementById('data-transacao').value = transacao.data.split('T')[0];
  document.getElementById('descricao-transacao').value = transacao.descricao;
  document.getElementById('tipo-transacao').value = transacao.tipo.toLowerCase();
  document.getElementById('valor-transacao').value = transacao.valor;
  
  // Abrir modal
  modal.classList.remove('hidden');
}

// Excluir transação
async function excluirTransacao(id) {
  try {
    const response = await fetchWithAuth(`/api/transacoes/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      adicionarNotificacao('Transação excluída com sucesso!', 'success');
      await buscarTransacoes();
    } else {
      adicionarNotificacao('Erro ao excluir transação', 'error');
    }
  } catch (error) {
    LOG.error('Erro ao excluir transação:', error);
    adicionarNotificacao('Erro de conexão ao excluir transação', 'error');
  }
}

// Função para adicionar transação à tabela (para compatibilidade)
export function adicionarTransacaoATabela(data) {
  const tbody = document.querySelector('#financeiro tbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.classList.add('hover:bg-gray-50', 'transition-colors');
  const dataFormatada = new Date(data.data).toLocaleDateString('pt-BR');
  const valorFormatado = data.tipo.toLowerCase() === 'despesa' ? `- R$ ${data.valor.toFixed(2)}` : `R$ ${data.valor.toFixed(2)}`;
  const tipoCor = data.tipo.toLowerCase() === 'receita' ? 'text-green-600' : 'text-red-600';
  tr.innerHTML = `
    <td class="px-6 py-4 whitespace-nowrap">${dataFormatada}</td>
    <td class="px-6 py-4 whitespace-nowrap">${data.descricao}</td>
    <td class="px-6 py-4 whitespace-nowrap"><span class="${tipoCor}">${data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1).toLowerCase()}</span></td>
    <td class="px-6 py-4 whitespace-nowrap font-medium">${valorFormatado}</td>
    <td class="px-6 py-4 whitespace-nowrap">
      <div class="flex items-center gap-2">
        <button class="btn-editar-transacao text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50 transition-colors" data-id="${data.id}" title="Editar">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button class="btn-excluir-transacao text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors" data-id="${data.id}" title="Excluir">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </td>
  `;
  tbody.insertBefore(tr, tbody.firstChild);
  configurarBotoesTransacao();
}

// Configurar filtros de período
function configurarFiltros() {
  const filtros = document.querySelectorAll('.filtro-periodo');
  const inputData = document.getElementById('filtro-data-financeiro');
  
  // Definir data atual no input
  if (inputData) {
    inputData.value = new Date().toISOString().split('T')[0];
    
    inputData.addEventListener('change', (e) => {
      dataFiltro = new Date(e.target.value + 'T12:00:00');
      aplicarFiltro();
    });
  }
  
  filtros.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover classe active de todos
      filtros.forEach(f => {
        f.classList.remove('active', 'bg-white', 'shadow-sm', 'text-gray-800');
        f.classList.add('text-gray-600');
      });
      
      // Adicionar classe active ao clicado
      btn.classList.add('active', 'bg-white', 'shadow-sm', 'text-gray-800');
      btn.classList.remove('text-gray-600');
      
      filtroAtual = btn.dataset.periodo;
      aplicarFiltro();
    });
  });
}

// Inicializar página financeiro quando carregada
export function initFinanceiroPage() {
  LOG.info('🚀 Inicializando página financeiro...');
  
  // Configurar filtros
  configurarFiltros();
  
  // Resetar filtro para "todos"
  filtroAtual = 'todos';
  dataFiltro = new Date();
  
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
