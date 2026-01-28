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
    
    console.log('[about] Buscando conteúdo em:', apiUrl(endpoint));
    
    const res = await fetch(apiUrl(endpoint));
    if (!res.ok) {
      console.warn('[about] Erro ao buscar conteúdo:', res.status);
      exibirErroAbout();
      return;
    }

    const json = await res.json();
    console.log('[about] Resposta JSON completa:', json);
    
    const dados = json.data?.about || json.about;

    console.log('[about] Dados about extraídos:', dados);
    console.log('[about] Stats presentes:', dados?.stats);

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
    const statsContainer = document.getElementById('about-stats');
    const cards = document.querySelectorAll('.about-card');
    
    if (dados.stats && Array.isArray(dados.stats) && dados.stats.length > 0) {
      // Verificar se há pelo menos um stat válido
      const hasValidStats = dados.stats.some(stat => stat.numero && stat.texto);
      
      if (hasValidStats) {
        dados.stats.forEach((stat, index) => {
          if (cards[index]) {
            const cardNumber = cards[index].querySelector('.card-number');
            const cardLabel = cards[index].querySelector('.card-label');
            
            if (stat.numero && stat.texto) {
              if (cardNumber) cardNumber.textContent = stat.numero;
              if (cardLabel) cardLabel.textContent = stat.texto;
              cards[index].style.display = '';
            } else {
              cards[index].style.display = 'none';
            }
          }
        });
        
        // Esconder cards extras se houver menos stats
        for (let i = dados.stats.length; i < cards.length; i++) {
          cards[i].style.display = 'none';
        }
        
        if (statsContainer) statsContainer.style.display = '';
        console.log('[about] Stats atualizados:', dados.stats);
      } else {
        // Sem stats válidos - esconder container
        if (statsContainer) statsContainer.style.display = 'none';
        console.log('[about] Nenhum stat válido encontrado');
      }
    } else {
      // Sem stats - esconder container ou mostrar padrão
      console.log('[about] Nenhum stat no retorno, usando padrão');
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
    aboutSubtitle.textContent = 'Conheça nossa história';
  }
  
  if (aboutText) {
    aboutText.innerHTML = `
      <p>Somos a Vitaly Hub, equipe especializada em beleza e estética.</p>
      <p>Com anos de experiência no mercado da beleza, nosso objetivo é realçar a beleza natural de cada cliente, criando visuais personalizados para ocasiões especiais.</p>
      <p>Acreditamos que a beleza tem o poder de elevar a autoestima e fazer cada pessoa se sentir única e especial.</p>
    `;
  }
  
  console.log('[about] Usando conteúdo padrão');
}

export function initAbout() {
  console.log('[about] Inicializando About...');
  carregarAbout();
}
