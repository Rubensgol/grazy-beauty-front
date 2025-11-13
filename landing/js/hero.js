import { fetchWithAuth } from '../../js/configuracao/http.js';
import { apiUrl } from '../../js/configuracao/config.js';

/**
 * Buscar e aplicar conteúdo do Hero do backend
 */
async function carregarHero() {
  try {
    const res = await fetchWithAuth('/api/conteudo');
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
 * Exibir mensagem de erro no Hero
 */
function exibirErroHero() {
  const heroTitle = document.querySelector('.hero-title');
  const heroDescription = document.querySelector('.hero-description');
  
  if (heroTitle) {
    heroTitle.innerHTML = '<span style="color: #ef4444;">Erro ao carregar conteúdo</span>';
  }
  
  if (heroDescription) {
    heroDescription.textContent = 'Não foi possível carregar o conteúdo do Hero. Tente novamente mais tarde.';
  }
}

export function initHero() {
  console.log('[hero] Inicializando Hero...');
  carregarHero();
}
