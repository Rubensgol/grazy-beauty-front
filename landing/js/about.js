import { fetchWithAuth } from '../../js/configuracao/http.js';
import { apiUrl } from '../../js/configuracao/config.js';

/**
 * Buscar e aplicar conteúdo do About do backend
 */
async function carregarAbout() {
  try {
    const res = await fetchWithAuth('/api/conteudo');
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
 * Exibir mensagem de erro no About
 */
function exibirErroAbout() {
  const aboutTitle = document.querySelector('.about .section-title');
  const aboutSubtitle = document.querySelector('.about .section-subtitle');
  const aboutText = document.querySelector('.about-text');
  
  if (aboutTitle) {
    aboutTitle.innerHTML = '<span style="color: #ef4444;">Erro ao carregar</span>';
  }
  
  if (aboutSubtitle) {
    aboutSubtitle.textContent = 'Erro';
  }
  
  if (aboutText) {
    aboutText.innerHTML = '<p style="color: #ef4444;">Não foi possível carregar o conteúdo da seção Sobre. Tente novamente mais tarde.</p>';
  }
}

export function initAbout() {
  console.log('[about] Inicializando About...');
  carregarAbout();
}
