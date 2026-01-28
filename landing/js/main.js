import { 
  initHeaderScroll, 
  initMobileMenu, 
  initSmoothScroll, 
  initScrollToTop 
} from './navigation.js';

import { 
  initContactForm, 
  initFormValidation 
} from './forms.js';

import { 
  initScrollAnimations, 
  initStatsCounter, 
  initLazyLoading 
} from './animations.js';

import { initPortfolio } from './portfolio.js';

import { initServicos } from './servicos.js';

import { initHero } from './hero.js';

import { initAbout } from './about.js';

import { 
  preloadImages, 
  logConsoleMessage 
} from './utils.js';

import { apiUrl } from '../../js/configuracao/config.js';

/**
 * Inicializar tema do tenant baseado na configuração do backend
 */
async function initTenantTheme() {
  try {
    console.log('[main] Inicializando tema do tenant...');
    
    // Detectar tenant pelo subdomínio
    const subdomain = detectTenantSubdomain();
    console.log('[main] Subdomínio detectado:', subdomain);
    
    // Buscar configuração do tenant
    const config = await fetchTenantConfig(subdomain);
    console.log('[main] Configuração recebida:', config);
    
    if (config) {
      applyTenantBranding(config);
      console.log('[main] Branding aplicado com sucesso');
    } else {
      console.log('[main] Nenhuma configuração encontrada, usando padrão');
    }
  } catch (error) {
    console.error('[main] Erro ao carregar tema:', error);
  }
}

/**
 * Detectar subdomínio do tenant
 */
function detectTenantSubdomain() {
  // Primeiro, verificar se há parâmetro na URL (para testes em localhost)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant');
  if (tenantParam) {
    console.log('[main] Tenant detectado via parâmetro URL:', tenantParam);
    return tenantParam;
  }
  
  const hostname = window.location.hostname;
  
  // Se for localhost ou IP, retornar null
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }
  
  // Extrair subdomínio (ex: joao.grazybeauty.com.br → joao)
  const parts = hostname.split('.');
  if (parts.length > 2) {
    const potentialSubdomain = parts[0];
    // Ignorar www
    if (potentialSubdomain !== 'www') {
      return potentialSubdomain;
    }
  }
  
  return null;
}

/**
 * Buscar configuração do tenant no backend
 */
async function fetchTenantConfig(subdomain) {
  try {
    // Se não houver subdomínio, tentar buscar do localStorage (para preview)
    const cachedConfig = localStorage.getItem('tenantConfig');
    if (cachedConfig) {
      return JSON.parse(cachedConfig);
    }
    
    // Buscar do backend se houver subdomínio
    if (subdomain) {
      const response = await fetch(apiUrl(`/api/config/${subdomain}`));
      if (response.ok) {
        const data = await response.json();
        return data.data || data;
      }
    }
    
    // Se não houver subdomínio, buscar config padrão
    const defaultResponse = await fetch(apiUrl('/api/config'));
    if (defaultResponse.ok) {
      const data = await defaultResponse.json();
      return data.data || data;
    }
    
    return null;
  } catch (error) {
    console.warn('Não foi possível carregar configuração do tenant:', error);
    return null;
  }
}

/**
 * Aplicar branding do tenant na landing page
 */
function applyTenantBranding(config) {
  console.log('[main] Aplicando branding do tenant:', config);
  
  // Aplicar cor principal (suporta ambos os nomes de campo)
  const primaryColor = config.corPrimaria || config.primaryColor;
  if (primaryColor) {
    document.documentElement.style.setProperty('--color-primary', primaryColor);
    document.documentElement.style.setProperty('--color-primary-hover', adjustColor(primaryColor, -15));
    document.documentElement.style.setProperty('--color-primary-dark', adjustColor(primaryColor, -20));
    document.documentElement.style.setProperty('--color-primary-light', adjustColor(primaryColor, 30));
    document.documentElement.style.setProperty('--accent', primaryColor);
    document.documentElement.style.setProperty('--accent-hover', adjustColor(primaryColor, -15));
    
    console.log('[main] Cor primária aplicada:', primaryColor);
    
    // Atualizar cores em elementos específicos
    updateAccentElements(primaryColor);
  }
  
  // Aplicar cor secundária
  const secondaryColor = config.corSecundaria || config.secondaryColor;
  if (secondaryColor) {
    document.documentElement.style.setProperty('--color-secondary', secondaryColor);
    document.documentElement.style.setProperty('--color-dark', secondaryColor);
    
    // Atualizar elementos que usam cor secundária
    updateSecondaryElements(secondaryColor);
  }
  
  // Aplicar nome do negócio (suporta múltiplos campos)
  const businessName = config.nomeExibicao || config.nomeNegocio || config.businessName;
  if (businessName) {
    updateBusinessName(businessName);
    updateCopyrightName(businessName);
  }
  
  // Aplicar tagline/slogan
  const tagline = config.slogan || config.tagline;
  if (tagline) {
    updateTagline(tagline);
    updateSlogan(tagline);
  }
  
  // Aplicar logo
  if (config.logoUrl) {
    updateLogo(config.logoUrl);
  }
  
  // Aplicar favicon
  const faviconUrl = config.faviconUrl;
  if (faviconUrl) {
    updateFavicon(faviconUrl);
  }
  
  // Aplicar redes sociais e contato (suporta ambos os nomes)
  const whatsapp = config.whatsapp || config.whatsappNumber;
  if (whatsapp) {
    updateWhatsAppLinks(whatsapp);
    updatePhone(whatsapp); // Usar mesmo número para telefone
  }
  
  // Telefone separado se existir
  const telefone = config.telefone || config.phone;
  if (telefone) {
    updatePhone(telefone);
  }
  
  const instagram = config.instagram || config.instagramHandle;
  if (instagram) {
    updateInstagramLinks(instagram);
  }
  
  const facebook = config.facebook || config.facebookHandle;
  if (facebook) {
    updateFacebookLinks(facebook);
  }
  
  if (config.email) {
    updateEmailLinks(config.email);
  }
  
  const address = config.endereco || config.address;
  if (address) {
    updateAddress(address);
  }
  
  console.log('✅ Tema do tenant aplicado');
}

/**
 * Ajustar cor (clarear/escurecer)
 */
function adjustColor(hex, percent) {
  if (!hex) return hex;
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
 * Calcular luminância relativa de uma cor
 */
function getLuminance(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const linearize = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Determinar se deve usar texto escuro ou claro com base na cor de fundo
 */
function getContrastTextColor(bgColor) {
  const luminance = getLuminance(bgColor);
  // Se a luminância for alta (cor clara), usar texto escuro
  return luminance > 0.4 ? '#1f2937' : '#ffffff';
}

/**
 * Atualizar elementos com cor de destaque
 */
function updateAccentElements(color) {
  // Calcular cor de texto com contraste adequado
  const textColor = getContrastTextColor(color);
  
  // Definir variável CSS global para cor do texto dos botões
  document.documentElement.style.setProperty('--btn-primary-text', textColor);
  document.documentElement.style.setProperty('--color-accent', color);
  document.documentElement.style.setProperty('--color-accent-hover', adjustColor(color, -15));
  
  // Botões primários - aplicar cor de fundo E cor de texto
  document.querySelectorAll('.btn-primary, .cta-button').forEach(btn => {
    btn.style.backgroundColor = color;
    btn.style.color = textColor;
    btn.style.borderColor = color;
  });
  
  // Links de destaque
  document.querySelectorAll('.accent-link, .text-accent').forEach(el => {
    el.style.color = color;
  });
  
  // Bordas de destaque
  document.querySelectorAll('.border-accent').forEach(el => {
    el.style.borderColor = color;
  });
}

/**
 * Atualizar elementos com cor secundária
 */
function updateSecondaryElements(color) {
  // Footer
  document.querySelectorAll('.footer').forEach(el => {
    el.style.backgroundColor = color;
  });
  
  // Seções escuras
  document.querySelectorAll('.section-dark, .bg-dark').forEach(el => {
    el.style.backgroundColor = color;
  });
  
  // Títulos secundários
  document.querySelectorAll('.text-dark, .heading-dark').forEach(el => {
    el.style.color = color;
  });
  
  // Botões secundários
  document.querySelectorAll('.btn-secondary, .btn-dark').forEach(btn => {
    btn.style.backgroundColor = color;
  });
  
  console.log('[main] Cor secundária aplicada:', color);
}

/**
 * Atualizar nome do negócio
 */
function updateBusinessName(name) {
  console.log('[main] Atualizando nome do negócio para:', name);
  
  // Separar nome em duas partes (ex: "Grazy Medeiros" → "GRAZY" e "MEDEIROS")
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0]?.toUpperCase() || name.toUpperCase();
  const lastName = parts.slice(1).join(' ').toUpperCase() || '';
  
  console.log('[main] Nome dividido:', firstName, lastName);
  
  // Header logo main (primeira parte do nome)
  const logoMain = document.querySelector('.logo-main');
  if (logoMain) {
    logoMain.textContent = firstName;
    console.log('[main] Atualizado .logo-main:', firstName);
  } else {
    console.warn('[main] Elemento .logo-main não encontrado');
  }
  
  // Header logo sub (segunda parte do nome)
  const logoSub = document.querySelector('.logo-sub');
  if (logoSub) {
    logoSub.textContent = lastName;
    console.log('[main] Atualizado .logo-sub:', lastName);
  } else {
    console.warn('[main] Elemento .logo-sub não encontrado');
  }
  
  // Logo text (container) - se não tiver estrutura de main/sub
  const logoText = document.querySelector('.logo-text');
  if (logoText && !logoText.querySelector('.logo-main')) {
    logoText.textContent = name;
  }
  
  // Footer logo
  const footerLogoMain = document.querySelector('.footer-logo .logo-main');
  const footerLogoSub = document.querySelector('.footer-logo .logo-sub');
  if (footerLogoMain) {
    footerLogoMain.textContent = parts[0] || name;
    if (footerLogoSub) {
      footerLogoSub.textContent = parts.slice(1).join(' ') || '';
    }
  }
  
  // Footer brand name genérico
  const footerBrand = document.querySelector('.footer-brand-name');
  if (footerBrand) footerBrand.textContent = name;
  
  // Título da página
  document.title = name;
  console.log('[main] Título da página atualizado para:', name);
}

/**
 * Atualizar tagline
 */
function updateTagline(tagline) {
  const taglineEl = document.querySelector('.logo-tagline, .brand-tagline');
  if (taglineEl) taglineEl.textContent = tagline;
}

/**
 * Atualizar logo
 */
function updateLogo(logoUrl) {
  console.log('[main] Atualizando logo para:', logoUrl);
  
  // Determinar URL completa
  const logoHref = logoUrl.startsWith('http') || logoUrl.startsWith('data:')
    ? logoUrl
    : apiUrl(`/api/images/download/${encodeURIComponent(logoUrl)}`);
  
  const logos = document.querySelectorAll('.logo-image, .brand-logo, .logo-icon');
  logos.forEach(logo => {
    if (logo.tagName === 'IMG') {
      logo.src = logoHref;
    } else {
      logo.style.backgroundImage = `url(${logoHref})`;
    }
  });
}

/**
 * Atualizar favicon do site
 */
function updateFavicon(faviconUrl) {
  console.log('[main] Atualizando favicon para:', faviconUrl);
  
  // Determinar URL completa
  const faviconHref = faviconUrl.startsWith('http') || faviconUrl.startsWith('data:')
    ? faviconUrl
    : apiUrl(`/api/images/download/${encodeURIComponent(faviconUrl)}`);
  
  // Atualizar favicon existente ou criar novo
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = faviconHref;
  
  // Também atualizar shortcut icon se existir
  const shortcutIcon = document.querySelector('link[rel="shortcut icon"]');
  if (shortcutIcon) {
    shortcutIcon.href = faviconHref;
  }
  
  console.log('[main] Favicon atualizado');
}

/**
 * Atualizar links do WhatsApp
 */
function updateWhatsAppLinks(number) {
  const formattedNumber = number.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/55${formattedNumber}`;
  
  console.log('[main] Atualizando WhatsApp para:', whatsappUrl);
  
  // Atualizar links do WhatsApp
  document.querySelectorAll('a[href*="wa.me"], .whatsapp-link').forEach(link => {
    link.href = whatsappUrl;
    console.log('[main] WhatsApp link atualizado');
  });
}

/**
 * Atualizar links do Instagram
 */
function updateInstagramLinks(handle) {
  // Remover @ se existir
  const cleanHandle = handle.replace(/^@/, '');
  const instagramUrl = `https://instagram.com/${cleanHandle}`;
  
  console.log('[main] Atualizando Instagram para:', instagramUrl);
  
  document.querySelectorAll('a[href*="instagram.com"], .instagram-link').forEach(link => {
    link.href = instagramUrl;
    console.log('[main] Instagram link atualizado');
  });
}

/**
 * Atualizar links do Facebook
 */
function updateFacebookLinks(handle) {
  const facebookUrl = `https://facebook.com/${handle}`;
  
  console.log('[main] Atualizando Facebook para:', facebookUrl);
  
  document.querySelectorAll('a[href*="facebook.com"], .facebook-link').forEach(link => {
    link.href = facebookUrl;
  });
}

/**
 * Atualizar links de e-mail
 */
function updateEmailLinks(email) {
  console.log('[main] Atualizando email para:', email);
  
  // Atualizar link do email no footer
  document.querySelectorAll('.tenant-email-link').forEach(link => {
    link.href = `mailto:${email}`;
  });
  
  // Atualizar texto do email
  document.querySelectorAll('.tenant-email').forEach(el => {
    el.textContent = email;
  });
  
  // Fallback para seletores genéricos
  document.querySelectorAll('a[href^="mailto:"], .email-link').forEach(link => {
    link.href = `mailto:${email}`;
  });
  
  document.querySelectorAll('.email-text').forEach(el => {
    el.textContent = email;
  });
}

/**
 * Atualizar endereço
 */
function updateAddress(address) {
  console.log('[main] Atualizando endereço para:', address);
  
  // Atualizar texto do endereço no footer
  document.querySelectorAll('.tenant-address').forEach(el => {
    el.innerHTML = address.replace(/\n/g, '<br>');
  });
  
  // Atualizar link do Google Maps
  const mapsQuery = encodeURIComponent(address.replace(/<br>/g, ' ').replace(/\n/g, ' '));
  document.querySelectorAll('.tenant-address-link').forEach(link => {
    link.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  });
  
  // Fallback para seletores genéricos
  document.querySelectorAll('.address-text, .location-address').forEach(el => {
    el.textContent = address;
  });
}

/**
 * Atualizar telefone
 */
function updatePhone(phone) {
  console.log('[main] Atualizando telefone para:', phone);
  
  const formattedPhone = phone.replace(/\D/g, '');
  
  // Atualizar link do telefone no footer
  document.querySelectorAll('.tenant-phone-link').forEach(link => {
    link.href = `tel:+55${formattedPhone}`;
  });
  
  // Atualizar texto do telefone
  document.querySelectorAll('.tenant-phone').forEach(el => {
    el.textContent = formatPhoneDisplay(phone);
  });
}

/**
 * Formatar número de telefone para exibição
 */
function formatPhoneDisplay(phone) {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  } else if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return phone;
}

/**
 * Atualizar slogan/descrição do footer
 */
function updateSlogan(slogan) {
  console.log('[main] Atualizando slogan para:', slogan);
  
  document.querySelectorAll('.tenant-slogan, .footer-description').forEach(el => {
    el.textContent = slogan;
  });
}

/**
 * Atualizar nome no copyright
 */
function updateCopyrightName(name) {
  document.querySelectorAll('.tenant-copyright-name').forEach(el => {
    el.textContent = name;
  });
}


async function init() {
  console.log('[main] Inicializando landing page...');
  
  // Inicializar navegação primeiro (já que o header está carregado)
  initHeaderScroll();
  initMobileMenu();
  initSmoothScroll();
  initScrollToTop();
  initContactForm();
  initFormValidation();
  
  initScrollAnimations();
  initStatsCounter();
  initLazyLoading();
  
  // Carregar conteúdo dinâmico
  initHero();
  initAbout();
  initPortfolio();
  initServicos();
  
  // Aplicar tema do tenant (aguardar para garantir que atualize o DOM)
  await initTenantTheme();
  
  preloadImages();
  logConsoleMessage();
  
  console.log('[main] Landing page inicializada');
}

window.addEventListener('sectionsLoaded', init);
