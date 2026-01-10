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
 * Buscar e aplicar conteúdo do About do backend
 */
async function carregarAbout() {
  try {
    // Detectar subdomínio para buscar conteúdo do tenant correto
    const subdomain = detectTenantSubdomain();
    
    // Usar endpoint por subdomínio se disponível, senão endpoint padrão
    const endpoint = subdomain 
      ? `/api/conteudo/${subdomain}` 
      : '/api/conteudo';
    
    const res = await fetch(apiUrl(endpoint));
    if (!res.ok) {
      console.warn('[about] Erro ao buscar conteúdo:', res.status);
      exibirErroAbout();
      return;
    }

    const json = await res.json();
    const dados = json.data?.about || json.about;

    console.log('[about] Dados recebidos:', dados);

    // Verificar se há dados válidos
    if (!dados || (!dados.titulo && !dados.subtitulo && !dados.texto)) {
      console.warn('[about] Nenhum dado válido recebido');
      exibirErroAbout();
      return;
    }

    // Atualizar título
    if (dados.titulo) {
      const aboutTitle = document.querySelector('.about .section-title');
      if (aboutTitle) {
        aboutTitle.textContent = dados.titulo;
      }
    }

    // Atualizar subtítulo
    if (dados.subtitulo) {
      const aboutSubtitle = document.querySelector('.about .section-subtitle');
      if (aboutSubtitle) {
        aboutSubtitle.textContent = dados.subtitulo;
      }
    }

    // Atualizar texto principal
    if (dados.texto) {
      const aboutText = document.querySelector('.about-text');
      if (aboutText) {
        // Dividir texto em parágrafos (por quebras de linha duplas ou simples)
        const textoLimpo = dados.texto.trim();
        const paragrafos = textoLimpo.split('\n\n').filter(p => p.trim());
        
        if (paragrafos.length > 0) {
          aboutText.innerHTML = paragrafos.map(p => `<p>${p.trim()}</p>`).join('');
        } else {
          // Se não há quebras duplas, usar o texto como um único parágrafo
          aboutText.innerHTML = `<p>${textoLimpo}</p>`;
        }
      }
    }

    // Atualizar imagem
    if (dados.imagemUrl) {
      const aboutImages = document.querySelectorAll('.about-images .about-img');
      if (aboutImages.length > 0) {
        const imgUrl = dados.imagemUrl.startsWith('http') 
          ? dados.imagemUrl 
          : apiUrl(`/api/images/download/${encodeURIComponent(dados.imagemUrl)}`);
        
        // Atualizar primeira imagem
        aboutImages[0].src = imgUrl;
        aboutImages[0].alt = dados.titulo || 'About Image';
      }
    }

    // Atualizar estatísticas/destaques
    if (dados.stats && Array.isArray(dados.stats)) {
      const cards = document.querySelectorAll('.about-card');
      
      dados.stats.forEach((stat, index) => {
        if (cards[index] && stat.numero && stat.texto) {
          const cardNumber = cards[index].querySelector('.card-number');
          const cardLabel = cards[index].querySelector('.card-label');
          
          if (cardNumber) cardNumber.textContent = stat.numero;
          if (cardLabel) cardLabel.textContent = stat.texto;
        }
      });
    }

    console.log('[about] About carregado com sucesso');
  } catch (err) {
    console.error('[about] Erro ao carregar about:', err);
    exibirErroAbout();
  }
}

/**
 * Exibir conteúdo padrão no About quando o backend falhar
 */
function exibirErroAbout() {
  const aboutTitle = document.querySelector('.about .section-title');
  const aboutSubtitle = document.querySelector('.about .section-subtitle');
  const aboutText = document.querySelector('.about-text');
  
  // Usar conteúdo padrão elegante em vez de mensagem de erro
  if (aboutTitle) {
    aboutTitle.textContent = 'SOBRE MIM';
  }
  
  if (aboutSubtitle) {
    aboutSubtitle.textContent = 'Conheça minha história';
  }
  
  if (aboutText) {
    aboutText.innerHTML = `
      <p>Sou Graziella Medeiros, maquiadora profissional apaixonada por transformar beleza em arte.</p>
      <p>Com anos de experiência no mercado da beleza, meu objetivo é realçar a beleza natural de cada cliente, criando looks personalizados para ocasiões especiais, noivas, formaturas e eventos.</p>
      <p>Acredito que a maquiagem tem o poder de elevar a autoestima e fazer cada pessoa se sentir única e especial.</p>
    `;
  }
  
  console.log('[about] Usando conteúdo padrão');
}

export function initAbout() {
  console.log('[about] Inicializando About...');
  carregarAbout();
}
