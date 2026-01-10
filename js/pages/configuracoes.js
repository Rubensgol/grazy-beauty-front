// Script para página de Configurações
import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { LOG } from '../configuracao/logger.js';
import { getTenantConfig, saveTenantConfig, uploadLogo, getCurrentConfig } from '../configuracao/tenant-config.js';

// Estado atual das configurações de notificação
let configAtual = {
  ativo: false,
  periodoMinutos: 30,
  plataformas: { EMAIL: '' },
  resumoAtivo: false,
  resumoEmail: ''
};

// Estado atual das configurações de identidade
let identityConfig = {
  businessName: '',
  tagline: '',
  primaryColor: '#b5879d',
  secondaryColor: '#2d3748',
  logoUrl: null,
  faviconUrl: null
};

// Estado atual das configurações de redes sociais
let socialConfig = {
  whatsappNumber: '',
  instagramHandle: '',
  facebookHandle: '',
  email: '',
  address: ''
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
  
  // Inicializar tabs
  initTabs();
  
  // Inicializar seção de identidade visual
  initIdentitySection();
  
  // Inicializar seção de redes sociais
  initSocialSection();
  
  // Inicializar seção de conta
  initAccountSection();
  
  // Buscar configurações ao carregar
  buscarConfiguracoes();
  
  // Conectar evento de clique do botão salvar notificações
  const botaoSalvar = document.getElementById('configuracoes-save-button');
  if (botaoSalvar) {
    botaoSalvar.addEventListener('click', salvarConfiguracoes);
    LOG.debug('✅ Botão salvar conectado');
  } else {
    LOG.warn('⚠️ Botão salvar não encontrado');
  }
  
  LOG.info('✅ Página de configurações inicializada');
}

/**
 * Inicializar sistema de tabs
 */
function initTabs() {
  const tabs = document.querySelectorAll('.config-tab');
  const panels = document.querySelectorAll('.config-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.dataset.tab;
      
      // Atualizar tabs ativas
      tabs.forEach(t => {
        t.classList.remove('active', 'border-b-2');
        t.classList.add('text-gray-500');
        t.style.borderColor = 'transparent';
      });
      tab.classList.add('active');
      tab.classList.remove('text-gray-500');
      tab.style.borderColor = 'var(--accent)';
      tab.style.color = 'var(--accent)';
      
      // Mostrar painel correspondente
      panels.forEach(panel => {
        if (panel.dataset.panel === targetPanel) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
    });
  });
  
  // Estilizar tab inicial
  const activeTab = document.querySelector('.config-tab.active');
  if (activeTab) {
    activeTab.style.borderColor = 'var(--accent)';
    activeTab.style.color = 'var(--accent)';
  }
}

/**
 * Inicializar seção de Identidade Visual
 */
function initIdentitySection() {
  // Carregar configuração atual
  loadIdentityConfig();
  
  // Color presets (cor principal)
  const presets = document.querySelectorAll('.color-preset');
  presets.forEach(preset => {
    preset.addEventListener('click', () => {
      const color = preset.dataset.color;
      updatePrimaryColor(color);
    });
  });
  
  // Color presets (cor secundária)
  const secondaryPresets = document.querySelectorAll('.secondary-color-preset');
  secondaryPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      const color = preset.dataset.color;
      updateSecondaryColor(color);
    });
  });
  
  // Color picker (principal)
  const colorPicker = document.getElementById('config-primary-color');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      updatePrimaryColor(e.target.value);
    });
  }
  
  // Color picker (secundária)
  const secondaryColorPicker = document.getElementById('config-secondary-color');
  if (secondaryColorPicker) {
    secondaryColorPicker.addEventListener('input', (e) => {
      updateSecondaryColor(e.target.value);
    });
  }
  
  // Hex input (principal)
  const hexInput = document.getElementById('config-color-hex');
  if (hexInput) {
    hexInput.addEventListener('change', (e) => {
      const value = e.target.value.trim();
      if (/^#([A-Fa-f0-9]{6})$/.test(value)) {
        updatePrimaryColor(value);
      }
    });
  }
  
  // Hex input (secundária)
  const secondaryHexInput = document.getElementById('config-secondary-color-hex');
  if (secondaryHexInput) {
    secondaryHexInput.addEventListener('change', (e) => {
      const value = e.target.value.trim();
      if (/^#([A-Fa-f0-9]{6})$/.test(value)) {
        updateSecondaryColor(value);
      }
    });
  }
  
  // Logo upload
  const logoUploadBtn = document.getElementById('config-logo-upload-btn');
  const logoInput = document.getElementById('config-logo-input');
  const logoRemoveBtn = document.getElementById('config-logo-remove-btn');
  
  if (logoUploadBtn && logoInput) {
    logoUploadBtn.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', handleLogoUpload);
  }
  
  if (logoRemoveBtn) {
    logoRemoveBtn.addEventListener('click', removeLogo);
  }
  
  // Favicon upload
  const faviconUploadBtn = document.getElementById('config-favicon-upload-btn');
  const faviconInput = document.getElementById('config-favicon-input');
  const faviconRemoveBtn = document.getElementById('config-favicon-remove-btn');
  
  if (faviconUploadBtn && faviconInput) {
    faviconUploadBtn.addEventListener('click', () => faviconInput.click());
    faviconInput.addEventListener('change', handleFaviconUpload);
  }
  
  if (faviconRemoveBtn) {
    faviconRemoveBtn.addEventListener('click', removeFavicon);
  }
  
  // Save button
  const saveBtn = document.getElementById('config-identity-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveIdentityConfig);
  }
}

/**
 * Carregar configuração de identidade do tenant
 */
async function loadIdentityConfig() {
  try {
    const config = getCurrentConfig();
    if (config) {
      identityConfig = {
        businessName: config.businessName || '',
        tagline: config.tagline || '',
        primaryColor: config.primaryColor || '#b5879d',
        secondaryColor: config.secondaryColor || '#2d3748',
        logoUrl: config.logoUrl || null,
        faviconUrl: config.faviconUrl || null
      };
      
      // Atualizar inputs
      const nameInput = document.getElementById('config-business-name');
      const taglineInput = document.getElementById('config-tagline');
      
      if (nameInput) nameInput.value = identityConfig.businessName;
      if (taglineInput) taglineInput.value = identityConfig.tagline;
      
      updatePrimaryColor(identityConfig.primaryColor);
      updateSecondaryColor(identityConfig.secondaryColor);
      updateLogoPreview(identityConfig.logoUrl);
      updateFaviconPreview(identityConfig.faviconUrl);
    }
  } catch (error) {
    LOG.error('Erro ao carregar configuração de identidade:', error);
  }
}

/**
 * Atualizar cor principal
 */
function updatePrimaryColor(color) {
  identityConfig.primaryColor = color;
  
  // Atualizar inputs
  const colorPicker = document.getElementById('config-primary-color');
  const hexInput = document.getElementById('config-color-hex');
  
  if (colorPicker) colorPicker.value = color;
  if (hexInput) hexInput.value = color;
  
  // Atualizar CSS variable para preview
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', adjustColor(color, -15));
  
  // Atualizar preview
  const previewBtn = document.getElementById('config-preview-btn');
  const previewLink = document.getElementById('config-preview-link');
  
  if (previewBtn) {
    previewBtn.style.backgroundColor = color;
  }
  if (previewLink) {
    previewLink.style.color = color;
  }
  
  // Atualizar seleção dos presets
  const presets = document.querySelectorAll('.color-preset');
  presets.forEach(preset => {
    if (preset.dataset.color.toLowerCase() === color.toLowerCase()) {
      preset.classList.add('ring-2', 'ring-offset-2', 'ring-gray-400');
    } else {
      preset.classList.remove('ring-2', 'ring-offset-2', 'ring-gray-400');
    }
  });
}

/**
 * Atualizar cor secundária
 */
function updateSecondaryColor(color) {
  identityConfig.secondaryColor = color;
  
  // Atualizar inputs
  const colorPicker = document.getElementById('config-secondary-color');
  const hexInput = document.getElementById('config-secondary-color-hex');
  
  if (colorPicker) colorPicker.value = color;
  if (hexInput) hexInput.value = color;
  
  // Atualizar CSS variable para preview
  document.documentElement.style.setProperty('--secondary-color', color);
  document.documentElement.style.setProperty('--color-secondary', color);
  
  // Atualizar preview
  const previewBtnSecondary = document.getElementById('config-preview-btn-secondary');
  if (previewBtnSecondary) {
    previewBtnSecondary.style.backgroundColor = color;
  }
  
  // Atualizar seleção dos presets
  const presets = document.querySelectorAll('.secondary-color-preset');
  presets.forEach(preset => {
    if (preset.dataset.color.toLowerCase() === color.toLowerCase()) {
      preset.classList.add('ring-2', 'ring-offset-2', 'ring-gray-400');
    } else {
      preset.classList.remove('ring-2', 'ring-offset-2', 'ring-gray-400');
    }
  });
}

/**
 * Ajustar cor (clarear/escurecer)
 */
function adjustColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

/**
 * Handle logo upload
 */
async function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validar tamanho (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    adicionarNotificacao('A imagem deve ter no máximo 2MB', 'error');
    return;
  }
  
  // Validar tipo
  if (!file.type.match(/^image\/(png|jpe?g|svg\+xml)$/)) {
    adicionarNotificacao('Formato não suportado. Use PNG, JPG ou SVG.', 'error');
    return;
  }
  
  try {
    // Mostrar preview local imediatamente
    const reader = new FileReader();
    reader.onload = (e) => {
      updateLogoPreview(e.target.result);
      identityConfig.logoUrl = e.target.result; // Temporário até upload
    };
    reader.readAsDataURL(file);
    
    // Fazer upload real (quando backend estiver pronto)
    // const result = await uploadLogo(file);
    // if (result.success) {
    //   identityConfig.logoUrl = result.url;
    // }
    
    adicionarNotificacao('Logo carregada! Clique em salvar para confirmar.', 'success');
  } catch (error) {
    LOG.error('Erro ao fazer upload da logo:', error);
    adicionarNotificacao('Erro ao fazer upload da logo', 'error');
  }
}

/**
 * Atualizar preview da logo
 */
function updateLogoPreview(url) {
  const preview = document.getElementById('config-logo-preview');
  const removeBtn = document.getElementById('config-logo-remove-btn');
  
  if (!preview) return;
  
  if (url) {
    preview.innerHTML = `<img src="${url}" alt="Logo" class="w-full h-full object-contain rounded-xl">`;
    if (removeBtn) removeBtn.classList.remove('hidden');
  } else {
    preview.innerHTML = `<span class="text-gray-400 text-sm">Sem logo</span>`;
    if (removeBtn) removeBtn.classList.add('hidden');
  }
}

/**
 * Remover logo
 */
function removeLogo() {
  identityConfig.logoUrl = null;
  updateLogoPreview(null);
  
  const logoInput = document.getElementById('config-logo-input');
  if (logoInput) logoInput.value = '';
  
  adicionarNotificacao('Logo removida. Clique em salvar para confirmar.', 'info');
}

/**
 * Handle favicon upload
 */
async function handleFaviconUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validar tamanho (500KB max)
  if (file.size > 500 * 1024) {
    adicionarNotificacao('O favicon deve ter no máximo 500KB', 'error');
    return;
  }
  
  // Validar tipo
  if (!file.type.match(/^image\/(png|svg\+xml|x-icon|vnd\.microsoft\.icon)$/)) {
    adicionarNotificacao('Formato não suportado. Use PNG, SVG ou ICO.', 'error');
    return;
  }
  
  try {
    // Mostrar preview local imediatamente
    const reader = new FileReader();
    reader.onload = (e) => {
      updateFaviconPreview(e.target.result);
      identityConfig.faviconUrl = e.target.result; // Temporário até upload
    };
    reader.readAsDataURL(file);
    
    adicionarNotificacao('Favicon carregado! Clique em salvar para confirmar.', 'success');
  } catch (error) {
    LOG.error('Erro ao fazer upload do favicon:', error);
    adicionarNotificacao('Erro ao fazer upload do favicon', 'error');
  }
}

/**
 * Atualizar preview do favicon
 */
function updateFaviconPreview(url) {
  const preview = document.getElementById('config-favicon-preview');
  const removeBtn = document.getElementById('config-favicon-remove-btn');
  
  if (!preview) return;
  
  if (url) {
    preview.innerHTML = `<img src="${url}" alt="Favicon" class="w-full h-full object-contain rounded-lg">`;
    if (removeBtn) removeBtn.classList.remove('hidden');
  } else {
    preview.innerHTML = `
      <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    `;
    if (removeBtn) removeBtn.classList.add('hidden');
  }
}

/**
 * Remover favicon
 */
function removeFavicon() {
  identityConfig.faviconUrl = null;
  updateFaviconPreview(null);
  
  const faviconInput = document.getElementById('config-favicon-input');
  if (faviconInput) faviconInput.value = '';
  
  adicionarNotificacao('Favicon removido. Clique em salvar para confirmar.', 'info');
}

/**
 * Salvar configuração de identidade
 */
async function saveIdentityConfig() {
  const saveBtn = document.getElementById('config-identity-save');
  const originalText = saveBtn ? saveBtn.textContent : '';
  
  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';
    }
    
    // Coletar dados dos inputs
    const nameInput = document.getElementById('config-business-name');
    const taglineInput = document.getElementById('config-tagline');
    
    const configToSave = {
      businessName: nameInput ? nameInput.value : identityConfig.businessName,
      tagline: taglineInput ? taglineInput.value : identityConfig.tagline,
      primaryColor: identityConfig.primaryColor,
      secondaryColor: identityConfig.secondaryColor,
      logoUrl: identityConfig.logoUrl,
      faviconUrl: identityConfig.faviconUrl
    };
    
    // Salvar usando o tenant-config service
    await saveTenantConfig(configToSave);
    
    adicionarNotificacao('Identidade visual salva com sucesso!', 'success');
  } catch (error) {
    LOG.error('Erro ao salvar identidade visual:', error);
    adicionarNotificacao('Erro ao salvar identidade visual', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
}

/**
 * Inicializar seção de Redes Sociais
 */
function initSocialSection() {
  // Carregar configuração atual
  loadSocialConfig();
  
  // Save button
  const saveBtn = document.getElementById('config-social-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveSocialConfig);
  }
}

/**
 * Carregar configuração de redes sociais
 */
async function loadSocialConfig() {
  try {
    const config = getCurrentConfig();
    if (config) {
      socialConfig = {
        whatsappNumber: config.whatsappNumber || '',
        instagramHandle: config.instagramHandle || '',
        facebookHandle: config.facebookHandle || '',
        email: config.email || '',
        address: config.address || ''
      };
      
      // Atualizar inputs
      const whatsappInput = document.getElementById('config-whatsapp');
      const instagramInput = document.getElementById('config-instagram');
      const facebookInput = document.getElementById('config-facebook');
      const emailInput = document.getElementById('config-email');
      const addressInput = document.getElementById('config-address');
      
      if (whatsappInput) whatsappInput.value = socialConfig.whatsappNumber;
      if (instagramInput) instagramInput.value = socialConfig.instagramHandle;
      if (facebookInput) facebookInput.value = socialConfig.facebookHandle;
      if (emailInput) emailInput.value = socialConfig.email;
      if (addressInput) addressInput.value = socialConfig.address;
    }
  } catch (error) {
    LOG.error('Erro ao carregar configuração de redes sociais:', error);
  }
}

/**
 * Salvar configuração de redes sociais
 */
async function saveSocialConfig() {
  const saveBtn = document.getElementById('config-social-save');
  const originalText = saveBtn ? saveBtn.textContent : '';
  
  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';
    }
    
    // Coletar dados dos inputs
    const configToSave = {
      whatsappNumber: document.getElementById('config-whatsapp')?.value || '',
      instagramHandle: document.getElementById('config-instagram')?.value || '',
      facebookHandle: document.getElementById('config-facebook')?.value || '',
      email: document.getElementById('config-email')?.value || '',
      address: document.getElementById('config-address')?.value || ''
    };
    
    // Salvar usando o tenant-config service
    await saveTenantConfig(configToSave);
    
    adicionarNotificacao('Redes sociais salvas com sucesso!', 'success');
  } catch (error) {
    LOG.error('Erro ao salvar redes sociais:', error);
    adicionarNotificacao('Erro ao salvar redes sociais', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
}

/**
 * Inicializar seção de Conta
 */
function initAccountSection() {
  // Carregar dados do usuário
  loadAccountData();
  
  // Save button
  const saveBtn = document.getElementById('config-account-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAccountData);
  }
}

/**
 * Carregar dados da conta
 */
async function loadAccountData() {
  try {
    const response = await fetchWithAuth('/api/users/me');
    if (response.ok) {
      const data = await response.json();
      const user = data.data || data;
      
      const nameInput = document.getElementById('config-owner-name');
      const emailInput = document.getElementById('config-owner-email');
      
      if (nameInput) nameInput.value = user.nome || user.name || '';
      if (emailInput) emailInput.value = user.email || '';
    }
  } catch (error) {
    LOG.error('Erro ao carregar dados da conta:', error);
  }
}

/**
 * Salvar dados da conta
 */
async function saveAccountData() {
  const saveBtn = document.getElementById('config-account-save');
  const originalText = saveBtn ? saveBtn.textContent : '';
  
  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';
    }
    
    const nameInput = document.getElementById('config-owner-name');
    const currentPassword = document.getElementById('config-current-password');
    const newPassword = document.getElementById('config-new-password');
    const confirmPassword = document.getElementById('config-confirm-password');
    
    // Atualizar nome
    if (nameInput && nameInput.value) {
      await fetchWithAuth('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nameInput.value })
      });
    }
    
    // Alterar senha se preenchida
    if (newPassword?.value && currentPassword?.value) {
      if (newPassword.value !== confirmPassword?.value) {
        adicionarNotificacao('As senhas não coincidem', 'error');
        return;
      }
      
      if (newPassword.value.length < 6) {
        adicionarNotificacao('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
      }
      
      await fetchWithAuth('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senhaAtual: currentPassword.value,
          novaSenha: newPassword.value
        })
      });
      
      // Limpar campos de senha
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
    }
    
    adicionarNotificacao('Dados da conta salvos com sucesso!', 'success');
  } catch (error) {
    LOG.error('Erro ao salvar dados da conta:', error);
    adicionarNotificacao('Erro ao salvar dados da conta', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  }
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
