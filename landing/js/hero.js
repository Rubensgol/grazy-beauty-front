import { apiUrl } from '../../js/configuracao/config.js';

/**
 * Detectar subdomínio do tenant
 */
function detectTenantSubdomain() {
  // Verificar parâmetro na URL (para testes em localhost)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantParam = urlParams.get('tenant');
  if (tenantParam) {
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
 * Buscar e aplicar conteúdo do Hero do backend
 */
async function carregarHero() {
  try {
    // Detectar subdomínio para buscar conteúdo do tenant correto
    const subdomain = detectTenantSubdomain();
    
    // Usar endpoint por subdomínio se disponível, senão endpoint padrão
    const endpoint = subdomain 
      ? `/api/conteudo/${subdomain}` 
      : '/api/conteudo';
    
    const res = await fetch(apiUrl(endpoint));
    if (!res.ok) {
      console.warn('[hero] Erro ao buscar conteúdo:', res.status);
      exibirErroHero();
      return;
    }

    const json = await res.json();
    const dados = json.data?.hero || json.hero;

    console.log('[hero] Dados recebidos:', dados);

    // Verificar se há dados válidos
    if (!dados || (!dados.titulo && !dados.subtitulo && !dados.imagemUrl)) {
      console.warn('[hero] Nenhum dado válido recebido');
      exibirErroHero();
      return;
    }

    // Atualizar título
    if (dados.titulo) {
      const heroTitle = document.querySelector('.hero-title');
      if (heroTitle) {
        heroTitle.innerHTML = dados.titulo;
      }
    }

    // Atualizar subtítulo
    if (dados.subtitulo) {
      const heroDescription = document.querySelector('.hero-description');
      if (heroDescription) {
        heroDescription.textContent = dados.subtitulo;
      }
    }

    // Atualizar imagem de fundo
    if (dados.imagemUrl) {
      const heroImage = document.querySelector('.hero-image img');
      if (heroImage) {
        const imgUrl = dados.imagemUrl.startsWith('http') 
          ? dados.imagemUrl 
          : apiUrl(`/api/images/download/${encodeURIComponent(dados.imagemUrl)}`);
        
        heroImage.src = imgUrl;
        heroImage.alt = dados.titulo || 'Hero Image';
      }
    }

    console.log('[hero] Hero carregado com sucesso');
  } catch (err) {
    console.error('[hero] Erro ao carregar hero:', err);
    exibirErroHero();
  }
}

/**
 * Exibir conteúdo padrão no Hero quando o backend falhar
 */
function exibirErroHero() {
  const heroTitle = document.querySelector('.hero-title');
  const heroDescription = document.querySelector('.hero-description');
  
  // Usar conteúdo padrão elegante em vez de mensagem de erro
  if (heroTitle) {
    heroTitle.innerHTML = 'Graziella<span class="hero-title-sub">Medeiros</span>';
  }
  
  if (heroDescription) {
    heroDescription.textContent = 'Especialista em maquiagem profissional. Transformando beleza em arte e momentos especiais em memórias inesquecíveis.';
  }
  
  console.log('[hero] Usando conteúdo padrão');
}

export function initHero() {
  console.log('[hero] Inicializando Hero...');
  carregarHero();
}
