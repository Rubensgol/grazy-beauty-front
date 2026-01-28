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
    
    // Verificar se o tenant está suspenso ou bloqueado
    const status = config.status || 'ATIVO';
    const isBlocked = status === 'SUSPENSO' || status === 'BLOQUEADO' || status === 'CANCELADO';
    
    if (isBlocked && !window.location.pathname.includes('suspenso')) {
      LOG.warn('[tenant-config] Tenant suspenso/bloqueado:', status);
      showSuspendedOverlay(config);
      return config;
    }
    
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
 * Mostra overlay de conta suspensa
 */
function showSuspendedOverlay(config) {
  const status = config.status;
  const motivo = config.motivoSuspensao || 'Sua conta está temporariamente suspensa.';
  
  let titulo = 'Conta Suspensa';
  let mensagem = motivo;
  let corFundo = '#dc2626'; // Vermelho
  
  if (status === 'BLOQUEADO') {
    titulo = 'Conta Bloqueada';
    mensagem = 'Sua conta foi bloqueada por violação dos termos de uso. Entre em contato com o suporte.';
    corFundo = '#1f2937'; // Cinza escuro
  } else if (status === 'CANCELADO') {
    titulo = 'Assinatura Cancelada';
    mensagem = 'Sua assinatura foi cancelada. Renove para continuar acessando o sistema.';
    corFundo = '#6b7280'; // Cinza
  }
  
  // Criar overlay
  const overlay = document.createElement('div');
  overlay.id = 'suspended-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
  `;
  
  overlay.innerHTML = `
    <div style="
      background: white;
      border-radius: 1rem;
      padding: 3rem;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    ">
      <div style="
        width: 80px;
        height: 80px;
        margin: 0 auto 1.5rem;
        background: ${corFundo};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="white" viewBox="0 0 24 24">
          ${status === 'SUSPENSO' 
            ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z"/>'
            : '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z"/>'
          }
        </svg>
      </div>
      
      <h2 style="
        font-size: 1.75rem;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 1rem;
      ">${titulo}</h2>
      
      <p style="
        color: #6b7280;
        font-size: 1rem;
        line-height: 1.6;
        margin-bottom: 2rem;
      ">${mensagem}</p>
      
      ${status === 'SUSPENSO' ? `
      <div style="
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1.5rem;
      ">
        <p style="color: #92400e; font-size: 0.875rem;">
          <strong>💡 Regularize sua situação</strong><br>
          Entre em contato com o suporte para reativar sua conta.
        </p>
      </div>
      ` : ''}
      
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <a href="https://wa.me/5521976180101?text=Olá, preciso de ajuda com minha conta suspensa" 
           target="_blank"
           style="
             display: inline-flex;
             align-items: center;
             gap: 0.5rem;
             padding: 0.75rem 1.5rem;
             background: #25d366;
             color: white;
             text-decoration: none;
             border-radius: 0.5rem;
             font-weight: 600;
             font-size: 0.875rem;
           ">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Falar com Suporte
        </a>
        
        <button onclick="window.location.href='/login.html'" style="
          padding: 0.75rem 1.5rem;
          background: #f3f4f6;
          color: #374151;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
        ">
          Voltar ao Login
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Bloquear scroll
  document.body.style.overflow = 'hidden';
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
