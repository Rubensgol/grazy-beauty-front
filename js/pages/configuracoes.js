// Script para página de Configurações
import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { LOG } from '../configuracao/logger.js';

// Estado atual das configurações
let configAtual = {
  ativo: false,
  periodoMinutos: 30,
  plataformas: { EMAIL: '' },
  resumoAtivo: false,
  resumoEmail: ''
};

function extrairResumoAtivo(dados = {}) {
  if (typeof dados.resumoAtivo === 'boolean') {
    return dados.resumoAtivo;
  }

  const resumo = dados.resumoAgendamentos;
  if (typeof resumo === 'boolean') {
    return resumo;
  }

  if (resumo && typeof resumo === 'object' && typeof resumo.ativo === 'boolean') {
    return resumo.ativo;
  }

  return false;
}

function extrairResumoEmail(dados = {}) {
  if (dados.resumoEmail) {
    return dados.resumoEmail;
  }

  const resumo = dados.resumoAgendamentos;
  if (resumo && typeof resumo === 'object' && resumo.email) {
    return resumo.email;
  }

  return '';
}

/**
 * Buscar configurações atuais do servidor
 */
export async function buscarConfiguracoes() {
  LOG.info('📋 Buscando configurações de notificação...');
  try {
    const response = await fetchWithAuth('/api/notificacao/config');
    
    if (response.ok) {
      const resultado = await response.json();
      LOG.debug('✅ Resposta recebida:', resultado);
      
      // Extrair dados (pode vir em resultado.data ou direto em resultado)
      const dados = resultado.data || resultado;
      LOG.debug('📊 Dados de configuração:', dados);
      
      // Atualizar estado local com estrutura correta
      const resumoAtivo = extrairResumoAtivo(dados);
      const resumoEmail = extrairResumoEmail(dados);
      configAtual = {
        ativo: dados.ativo !== false,
        periodoMinutos: dados.periodoMinutos || 30,
        plataformas: dados.plataformas || { EMAIL: '' },
        resumoAtivo: resumoAtivo,
        resumoEmail: resumoEmail
      };
      
      LOG.debug('💾 Estado local atualizado:', configAtual);
      
      // Atualizar interface
      atualizarInterface();
    } else {
      LOG.warn('⚠️ Erro ao buscar configurações:', response.status);
      adicionarNotificacao('Erro ao carregar configurações', 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao buscar configurações:', error);
    adicionarNotificacao('Erro de conexão ao buscar configurações', 'error');
  }
}

/**
 * Atualizar interface com valores atuais
 */
function atualizarInterface() {
  const resumoToggle = document.getElementById('resumo-agendamentos-toggle');
  if (resumoToggle) {
    resumoToggle.checked = configAtual.resumoAtivo === true;
  }

  const resumoEmailInput = document.getElementById('resumo-email-input');
  if (resumoEmailInput) {
    resumoEmailInput.value = configAtual.resumoEmail || '';
  }

  // Toggle de lembretes
  const toggleCheckbox = document.getElementById('toggle');
  if (toggleCheckbox) {
    toggleCheckbox.checked = configAtual.ativo === true;
  }
  
  // Período de envio (converter minutos para horas)
  const periodoInput = document.querySelector('input[type="number"]');
  if (periodoInput) {
    // Se são minutos, converter para horas ou manter como minutos
    const valor = configAtual.periodoMinutos || 30;
    // Se é múltiplo de 60, mostrar em horas
    if (valor % 60 === 0) {
      periodoInput.value = valor / 60;
    } else {
      periodoInput.value = valor;
    }
  }
  
  // Unidade de período
  const periodoSelect = document.querySelector('select');
  if (periodoSelect) {
    // Determinar unidade baseado no valor
    const valor = configAtual.periodoMinutos || 30;
    if (valor % 60 === 0) {
      periodoSelect.value = 'Horas antes';
    } else {
      periodoSelect.value = 'Minutos antes';
    }
  }
  
  // Canais de notificação (plataformas)
  const whatsappCheckbox = document.getElementById('whatsapp');
  const smsCheckbox = document.getElementById('sms');
  const emailCheckbox = document.getElementById('email');
  
  const plataformas = configAtual.plataformas || {};
  
  if (whatsappCheckbox) whatsappCheckbox.checked = plataformas.hasOwnProperty('WHATSAPP');
  if (smsCheckbox) smsCheckbox.checked = plataformas.hasOwnProperty('SMS');
  if (emailCheckbox) emailCheckbox.checked = plataformas.hasOwnProperty('EMAIL');
}

/**
 * Mapear unidade de período do servidor para display
 */
function mapearUnidade(unidade) {
  const mapa = {
    'minutos': 'Minutos antes',
    'horas': 'Horas antes',
    'dias': 'Dias antes',
    'Minutos antes': 'minutos',
    'Horas antes': 'horas',
    'Dias antes': 'dias'
  };
  return mapa[unidade] || 'Horas antes';
}

/**
 * Mapear display de unidade para minutos (formato da API)
 */
function converterParaMinutos(valor, unidade) {
  const conversao = {
    'Minutos antes': 1,
    'Horas antes': 60,
    'Dias antes': 24 * 60
  };
  const multiplicador = conversao[unidade] || 60;
  return parseInt(valor) * multiplicador;
}

/**
 * Coletar dados do formulário
 */
function coletarDados() {
  const resumoToggle = document.getElementById('resumo-agendamentos-toggle');
  const resumoEmailInput = document.getElementById('resumo-email-input');
  const toggleCheckbox = document.getElementById('toggle');
  const periodoInput = document.querySelector('input[type="number"]');
  const periodoSelect = document.querySelector('select');
  const whatsappCheckbox = document.getElementById('whatsapp');
  const smsCheckbox = document.getElementById('sms');
  const emailCheckbox = document.getElementById('email');
  
  // Coletar plataformas (sem valores de input)
  const plataformas = {};

  if (whatsappCheckbox && whatsappCheckbox.checked) {
    plataformas.WHATSAPP = '';
  }
  if (smsCheckbox && smsCheckbox.checked) {
    plataformas.SMS = '';
  }
  if (emailCheckbox && emailCheckbox.checked) {
    plataformas.EMAIL = '';
  }

  // Converter período para minutos
  const periodoValor = periodoInput ? parseInt(periodoInput.value) || 30 : 30;
  const unidadeSelecionada = periodoSelect ? periodoSelect.value : 'Horas antes';
  const periodoMinutos = converterParaMinutos(periodoValor, unidadeSelecionada);
  const resumoAtivo = resumoToggle ? resumoToggle.checked : false;
  const resumoEmail = resumoEmailInput ? resumoEmailInput.value : '';
  
  return {
    ativo: toggleCheckbox ? toggleCheckbox.checked : false,
    periodoMinutos: periodoMinutos,
    plataformas: plataformas,
    resumoAtivo: resumoAtivo,
    resumoEmail: resumoEmail,
    resumoAgendamentos: { ativo: resumoAtivo, email: resumoEmail }
  };
}

/**
 * Salvar configurações no servidor
 */
async function salvarConfiguracoes() {
  LOG.info('💾 Salvando configurações...');
  
  const dados = coletarDados();
  LOG.debug('📤 Dados a enviar:', dados);
  
  const botao = document.getElementById('configuracoes-save-button');
  const textoOriginal = botao ? botao.textContent : '';
  
  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Salvando...';
    }
    
    const response = await fetchWithAuth('/api/notificacao/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });
    
    LOG.debug('📡 Resposta do servidor:', response.status);
    
    if (response.ok) {
      const resultado = await response.json();
      LOG.info('✅ Configurações salvas com sucesso:', resultado);
      
      // Atualizar estado local com a resposta
      const dadosRetorno = resultado.data || resultado;
      const resumoAtivo = extrairResumoAtivo(dadosRetorno);
      const resumoEmail = extrairResumoEmail(dadosRetorno);
      configAtual = {
        ativo: dadosRetorno.ativo !== false,
        periodoMinutos: dadosRetorno.periodoMinutos || 30,
        plataformas: dadosRetorno.plataformas || {},
        resumoAtivo: resumoAtivo,
        resumoEmail: resumoEmail
      };
      
      // Atualizar interface
      atualizarInterface();
      
      adicionarNotificacao('Configurações salvas com sucesso!', 'success');
    } else {
      const errorText = await response.text().catch(() => response.statusText);
      LOG.error('❌ Erro ao salvar:', response.status, errorText);
      adicionarNotificacao(`Erro ao salvar configurações: ${response.status}`, 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao salvar configurações:', error);
    adicionarNotificacao('Erro de conexão ao salvar configurações', 'error');
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }
}

/**
 * Inicializar página de configurações
 */
export function initConfiguracoes() {
  LOG.info('🚀 Inicializando página de configurações...');
  
  // Buscar configurações ao carregar
  buscarConfiguracoes();
  
  // Conectar evento de clique do botão salvar
  const botaoSalvar = document.getElementById('configuracoes-save-button');
  if (botaoSalvar) {
    botaoSalvar.addEventListener('click', salvarConfiguracoes);
    LOG.debug('✅ Botão salvar conectado');
  } else {
    LOG.warn('⚠️ Botão salvar não encontrado');
  }
  
  LOG.info('✅ Página de configurações inicializada');
}

// Inicializar quando a página de configurações for carregada dinamicamente
window.addEventListener('DOMContentLoaded', () => {
  LOG.debug('📋 DOM carregado, observando página de configurações');
  
  // Ouvir quando a página configuracoes for carregada
  window.addEventListener('page:loaded', (event) => {
    if (event.detail && event.detail.page === 'configuracoes') {
      LOG.info('🎯 Página configurações foi carregada');
      initConfiguracoes();
    }
  });

  // Ouvir quando a página configuracoes for mostrada
  window.addEventListener('page:shown', (event) => {
    if (event.detail && event.detail.page === 'configuracoes') {
      LOG.debug('👁️ Página configurações está visível');
      // Recarregar configurações quando a página fica visível
      buscarConfiguracoes();
    }
  });

  // Verificar se a página já está carregada (para casos onde está já no DOM)
  const paginaConfiguracoes = document.getElementById('configuracoes');
  if (paginaConfiguracoes && !paginaConfiguracoes.classList.contains('hidden')) {
    LOG.info('🎯 Página configurações já carregada e visível');
    initConfiguracoes();
  }
});
