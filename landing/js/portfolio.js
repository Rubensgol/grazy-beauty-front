import { fetchWithAuth } from '../../js/configuracao/http.js';
import { apiUrl } from '../../js/configuracao/config.js';

// Função para buscar imagens do portfolio do backend
async function fetchPortfolioList() {
  try {
    const res = await fetchWithAuth('/api/images');
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    const json = await res.json();
    
    let lista = [];
    if (json && json.success && Array.isArray(json.data)) {
      lista = json.data;
    } else if (Array.isArray(json)) {
      lista = json;
    }
    
    return lista;
  } catch (err) {
    console.error('[fetchPortfolioList] erro:', err);
    return [];
  }
}

function buildImageSrc(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return apiUrl(`/api/images/download/${encodeURIComponent(item)}`);
  }
  if (item.src) return item.src;
  if (item.storedFilename) {
    return apiUrl(`/api/images/download/${encodeURIComponent(item.storedFilename)}`);
  }
  if (item.filename) {
    return apiUrl(`/api/images/download/${encodeURIComponent(item.filename)}`);
  }
  return null;
}

function inserirImagemPortfolio(item, index) {
  const grid = document.querySelector('.portfolio-grid');
  if (!grid) {
    console.warn('[inserirImagemPortfolio] grid não encontrado');
    return;
  }
  
  const src = buildImageSrc(item);
  
  if (!src) {
    console.warn('[inserirImagemPortfolio] imagem sem src válido, pulando:', item);
    return;
  }
  
  const desc = (typeof item === 'object' && item.descricao) ? item.descricao : 
               (typeof item === 'object' && item.description) ? item.description : '';
  const category = (typeof item === 'object' && item.categoria) ? item.categoria : 
                   (typeof item === 'object' && item.category) ? item.category : 'PORTFOLIO';
  const title = (typeof item === 'object' && item.titulo) ? item.titulo : 
                (typeof item === 'object' && item.title) ? item.title : `Trabalho ${index + 1}`;
  
  const portfolioItem = document.createElement('div');
  portfolioItem.className = 'portfolio-item';
  
  // Imagem placeholder para caso de erro
  const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImagem indisponível%3C/text%3E%3C/svg%3E';
  
  portfolioItem.innerHTML = `
    <div class="portfolio-image">
      <img src="${src}" alt="${title}" loading="lazy" onerror="this.src='${placeholderSvg}'; this.style.opacity='0.5';">
      <div class="portfolio-overlay">
        <div class="portfolio-info">
          <p class="portfolio-category">${category.toUpperCase()}</p>
          <h3 class="portfolio-title">${title}</h3>
          <p class="portfolio-description">${desc || 'Trabalho realizado com excelência'}</p>
        </div>
      </div>
    </div>
    <div class="portfolio-caption">
      <p class="portfolio-cat">${category.toUpperCase()}</p>
      <h3>${title}</h3>
    </div>
  `;
  
  portfolioItem.addEventListener('click', () => {
    portfolioItem.style.transform = 'scale(0.98)';
    setTimeout(() => {
      portfolioItem.style.transform = '';
    }, 200);
  });
  
  grid.appendChild(portfolioItem);
}

export async function initPortfolio() {
  const grid = document.querySelector('.portfolio-grid');
  if (!grid) {
    console.warn('[initPortfolio] grid não encontrado');
    return;
  }
  
  const lista = await fetchPortfolioList();
  
  if (lista.length > 0) {
    grid.innerHTML = '';
    
    // Filtrar apenas imagens válidas (com src não nulo)
    const imagensValidas = lista.filter(item => {
      const src = buildImageSrc(item);
      return src !== null && src !== undefined && src !== '';
    });
    
    if (imagensValidas.length === 0) {
      console.warn('[initPortfolio] nenhuma imagem válida encontrada');
      grid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Nenhuma imagem disponível no momento.</p>';
      return;
    }
    
    const portfolioImages = imagensValidas.slice(0, 6);
    portfolioImages.forEach((item, index) => inserirImagemPortfolio(item, index));
    
    console.log('[initPortfolio] portfolio carregado com', portfolioImages.length, 'imagens válidas');
  } else {
    console.log('[initPortfolio] backend sem imagens');
    grid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Nenhuma imagem disponível no momento.</p>';
  }
}
