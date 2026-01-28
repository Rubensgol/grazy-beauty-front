/**
 * Tenant Configuration Service
 * Sistema White Label Multi-Tenant
 * 
 * Gerencia configurações do tenant: cores, logo, nome, etc.
 * Aplica CSS variables dinamicamente baseado no backend.
 */

import { apiUrl } from './config.js';
import { fetchWithAuth } from './http.js';
import { LOG } from './logger.js';
import { getAuthToken } from './auth.js';

// Cache da configuração
let cachedConfig = null;
let configPromise = null;

// Configuração padrão - Vitaly Hub Brand
const DEFAULT_CONFIG = {
  primaryColor: '#86efac',
  primaryColorHover: '#77d99b',
  businessName: 'Vitaly Hub',
  businessTagline: 'Beleza & Estética',
  logoUrl: null,
  faviconUrl: null,
  whatsappNumber: '5521976180101',
  instagramUrl: 'https://instagram.com/vitalityhub',
  facebookUrl: 'https://www.facebook.com/vitalityhub',
  email: 'contato@grazybeauty.com.br',
  address: '',
  onboardingCompleted: false
};

/**
 * Calcula cor hover (mais escura) a partir da cor primária
 */
function calculateHoverColor(color) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = -20; // Escurecer
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Calcula cor mais clara a partir da cor primária
 */
function calculateLightColor(color, percent = 90) {
  const num = parseInt(color.replace('#', ''), 16);
  const R = (num >> 16);
  const G = (num >> 8 & 0x00FF);
  const B = (num & 0x0000FF);
  
  // Mix with white
  const newR = Math.round(R + (255 - R) * (percent / 100));
  const newG = Math.round(G + (255 - G) * (percent / 100));
  const newB = Math.round(B + (255 - B) * (percent / 100));
  
  return '#' + (0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1);
}

/**
 * Aplica as CSS Variables no documento
 */
function applyCSSVariables(config) {
  const root = document.documentElement;
  const primary = config.primaryColor || DEFAULT_CONFIG.primaryColor;
  const secondary = config.secondaryColor || '#2d3748';
  const hover = config.primaryColorHover || calculateHoverColor(primary);
  const light = calculateLightColor(primary, 90);
  const extraLight = calculateLightColor(primary, 95);
  
  // Cores do tenant (variáveis base)
  root.style.setProperty('--tenant-primary', primary);
  root.style.setProperty('--tenant-primary-hover', hover);
  root.style.setProperty('--tenant-primary-light', light);
  root.style.setProperty('--tenant-primary-extra-light', extraLight);
  
  // Cores principais (compatibilidade)
  root.style.setProperty('--accent', primary);
  root.style.setProperty('--accent-hover', hover);
  root.style.setProperty('--accent-light', light);
  root.style.setProperty('--accent-extra-light', extraLight);
  root.style.setProperty('--secondary-color', secondary);
  
  // Para compatibilidade com landing page
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-secondary', secondary);
  root.style.setProperty('--color-primary-hover', hover);
  root.style.setProperty('--color-primary-light', light);
  
  LOG.debug('[tenant-config] CSS variables aplicadas:', { primary, secondary, hover, light });
}

/**
 * Aplica a logo e favicon
 */
function applyBranding(config) {
  // Logo
  if (config.logoUrl) {
    const logoElements = document.querySelectorAll('[data-tenant-logo], .tenant-logo');
    logoElements.forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = config.logoUrl.startsWith('http') ? config.logoUrl : apiUrl(`/api/images/download/${encodeURIComponent(config.logoUrl)}`);
      }
    });
  }
  
  // Business Name
  if (config.businessName) {
    const nameElements = document.querySelectorAll('[data-tenant-name], .tenant-name');
    nameElements.forEach(el => {
      el.textContent = config.businessName;
    });
    
    // Update page title
    const currentTitle = document.title;
    if (!currentTitle.includes(config.businessName)) {
      document.title = currentTitle.replace('Vitality Hub', config.businessName);
    }
  }
  
  // Favicon
  if (config.faviconUrl) {
    const faviconHref = config.faviconUrl.startsWith('http') || config.faviconUrl.startsWith('data:') 
      ? config.faviconUrl 
      : apiUrl(`/api/images/download/${encodeURIComponent(config.faviconUrl)}`);
    
    // Atualiza ou cria o link do favicon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = faviconHref;
    
    // Também atualiza shortcut icon se existir
    const shortcutIcon = document.querySelector('link[rel="shortcut icon"]');
    if (shortcutIcon) {
      shortcutIcon.href = faviconHref;
    }
  }
  
  // WhatsApp links
  if (config.whatsappNumber) {
    const whatsappLinks = document.querySelectorAll('[data-tenant-whatsapp], a[href*="wa.me"]');
    whatsappLinks.forEach(el => {
      if (el.href) {
        const currentUrl = new URL(el.href);
        const newUrl = `https://wa.me/${config.whatsappNumber}`;
        // Preserve message if exists
        const text = currentUrl.searchParams.get('text');
        el.href = text ? `${newUrl}?text=${encodeURIComponent(text)}` : newUrl;
      }
    });
  }
  
  // Instagram links
  if (config.instagramUrl) {
    const igLinks = document.querySelectorAll('[data-tenant-instagram], a[href*="instagram.com"]');
    igLinks.forEach(el => {
      if (el.href && !el.href.includes('Vitality Hub')) {
        el.href = config.instagramUrl;
      }
    });
  }
  
  LOG.debug('[tenant-config] Branding aplicado');
}

/**
 * Mapeia campos do backend (português) para frontend (inglês)
 */
function mapBackendToFrontend(backendConfig) {
  if (!backendConfig) return null;
  
  return {
    primaryColor: backendConfig.corPrimaria || backendConfig.primaryColor,
    secondaryColor: backendConfig.corSecundaria || backendConfig.secondaryColor || '#2d3748',
    primaryColorHover: backendConfig.primaryColorHover || calculateHoverColor(backendConfig.corPrimaria || '#86efac'),
    businessName: backendConfig.nomeExibicao || backendConfig.nomeNegocio || backendConfig.businessName,
    businessTagline: backendConfig.slogan || backendConfig.businessTagline,
    tagline: backendConfig.slogan || backendConfig.tagline,
    logoUrl: backendConfig.logoUrl,
    faviconUrl: backendConfig.faviconUrl,
    whatsappNumber: backendConfig.whatsapp || backendConfig.whatsappNumber,
    instagramUrl: backendConfig.instagram || backendConfig.instagramUrl,
    instagramHandle: backendConfig.instagram || backendConfig.instagramHandle,
    facebookUrl: backendConfig.facebook || backendConfig.facebookUrl,
    facebookHandle: backendConfig.facebook || backendConfig.facebookHandle,
    email: backendConfig.email,
    address: backendConfig.endereco || backendConfig.address,
    onboardingCompleted: backendConfig.onboardingCompleto ?? backendConfig.onboardingCompleted,
    // Manter campos originais do backend também
    ...backendConfig
  };
}

/**
 * Mapeia campos do frontend (inglês) para backend (português)
 */
function mapFrontendToBackend(frontendConfig) {
  if (!frontendConfig) return null;
  
  const mapped = {};
  
  // Cores
  if (frontendConfig.primaryColor !== undefined) mapped.corPrimaria = frontendConfig.primaryColor;
  if (frontendConfig.secondaryColor !== undefined) mapped.corSecundaria = frontendConfig.secondaryColor;
  
  // Branding
  if (frontendConfig.businessName !== undefined) mapped.nomeExibicao = frontendConfig.businessName;
  if (frontendConfig.tagline !== undefined || frontendConfig.businessTagline !== undefined) {
    mapped.slogan = frontendConfig.tagline || frontendConfig.businessTagline;
  }
  if (frontendConfig.logoUrl !== undefined) mapped.logoUrl = frontendConfig.logoUrl;
  if (frontendConfig.faviconUrl !== undefined) mapped.faviconUrl = frontendConfig.faviconUrl;
  
  // Contato
  if (frontendConfig.whatsappNumber !== undefined) mapped.whatsapp = frontendConfig.whatsappNumber;
  if (frontendConfig.email !== undefined) mapped.email = frontendConfig.email;
  if (frontendConfig.address !== undefined) mapped.endereco = frontendConfig.address;
  
  // Redes sociais
  if (frontendConfig.instagramHandle !== undefined || frontendConfig.instagramUrl !== undefined) {
    mapped.instagram = frontendConfig.instagramHandle || frontendConfig.instagramUrl;
  }
  if (frontendConfig.facebookHandle !== undefined || frontendConfig.facebookUrl !== undefined) {
    mapped.facebook = frontendConfig.facebookHandle || frontendConfig.facebookUrl;
  }
  
  return mapped;
}

/**
 * Busca configuração do tenant do backend
 */
async function fetchTenantConfig() {
  try {
    const res = await fetchWithAuth('/api/config');
    
    if (!res.ok) {
      LOG.warn('[tenant-config] Erro ao buscar config:', res.status);
      return null;
    }
    
    const json = await res.json();
    const backendData = json.data || json;
    
    // Mapear campos do backend para frontend
    return mapBackendToFrontend(backendData);
  } catch (err) {
    LOG.error('[tenant-config] Erro de rede ao buscar config:', err);
    return null;
  }
}

/**
 * Salva configuração do tenant no backend
 */
export async function saveTenantConfig(config) {
  try {
    // Mapear campos do frontend para backend
    const backendConfig = mapFrontendToBackend(config);
    
    const res = await fetchWithAuth('/api/config', {
      method: 'PUT',
      body: JSON.stringify(backendConfig)
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const result = await res.json();
    
    // Atualizar cache com formato frontend e aplicar
    cachedConfig = { ...cachedConfig, ...config };
    applyCSSVariables(cachedConfig);
    applyBranding(cachedConfig);
    
    LOG.info('[tenant-config] Configuração salva');
    return result;
  } catch (err) {
    LOG.error('[tenant-config] Erro ao salvar config:', err);
    throw err;
  }
}

/**
 * Upload de logo
 */
export async function uploadLogo(file) {
  try {
    const formData = new FormData();
    formData.append('logo', file);
    
    const token = getAuthToken();
    const res = await fetch(apiUrl('/api/config/logo'), {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const result = await res.json();
    
    // Extrair dados da resposta ApiResposta
    const data = result.data || result;
    const logoUrl = data.logoUrl;
    
    // Atualizar cache
    if (logoUrl) {
      cachedConfig = { ...cachedConfig, logoUrl: logoUrl };
      applyBranding(cachedConfig);
    }
    
    LOG.info('[tenant-config] Logo enviada');
    return { success: true, logoUrl };
  } catch (err) {
    LOG.error('[tenant-config] Erro ao enviar logo:', err);
    throw err;
  }
}

/**
 * Obtém configuração (do cache ou backend)
 */
export async function getTenantConfig(forceRefresh = false) {
  // Retornar cache se existir e não forçar refresh
  if (cachedConfig && !forceRefresh) {
    return cachedConfig;
  }
  
  // Evitar múltiplas requisições simultâneas
  if (configPromise && !forceRefresh) {
    return configPromise;
  }
  
  configPromise = (async () => {
    const backendConfig = await fetchTenantConfig();
    cachedConfig = { ...DEFAULT_CONFIG, ...backendConfig };
    return cachedConfig;
  })();
  
  return configPromise;
}

/**
 * Inicializa o sistema de tema do tenant
 * Deve ser chamado no início da aplicação
 */
export async function initTenantTheme() {
  LOG.info('[tenant-config] Inicializando tema do tenant...');
  
  try {
    const config = await getTenantConfig();
    
    // Aplicar tema
    applyCSSVariables(config);
    applyBranding(config);
    
    // Verificar se precisa de onboarding
    if (!config.onboardingCompleted && !window.location.pathname.includes('onboarding')) {
      // Verificar se é primeiro acesso (após login)
      const isFirstAccess = localStorage.getItem('firstAccess') === 'true';
      if (isFirstAccess) {
        localStorage.removeItem('firstAccess');
        window.location.href = '/onboarding.html';
        return config;
      }
    }
    
    LOG.info('[tenant-config] Tema aplicado com sucesso');
    return config;
  } catch (err) {
    LOG.error('[tenant-config] Erro ao inicializar tema:', err);
    // Aplicar tema padrão
    applyCSSVariables(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

/**
 * Detecta o tenant pelo subdomínio
 */
export function detectTenantFromSubdomain() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // Se tem mais de 2 partes e não é www, é um subdomínio
  if (parts.length > 2 && parts[0] !== 'www') {
    return parts[0]; // Ex: "joao" de "joao.grazybeauty.com.br"
  }
  
  // Verificar se está em localhost com parâmetro de tenant
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant');
  if (tenantParam) {
    return tenantParam;
  }
  
  return null; // Tenant principal/padrão
}

/**
 * Retorna a configuração atual do cache (síncrono)
 */
export function getCurrentConfig() {
  return cachedConfig || DEFAULT_CONFIG;
}

/**
 * Atualiza uma propriedade específica da configuração
 */
export function updateConfigProperty(property, value) {
  if (cachedConfig) {
    cachedConfig[property] = value;
    
    // Re-aplicar se for cor
    if (property === 'primaryColor') {
      applyCSSVariables(cachedConfig);
    }
  }
}

// Auto-inicializar quando o módulo é carregado
// (comentado para permitir controle manual)
// initTenantTheme();

export {
  DEFAULT_CONFIG,
  applyCSSVariables,
  applyBranding,
  calculateHoverColor,
  calculateLightColor
};
