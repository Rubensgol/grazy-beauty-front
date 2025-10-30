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
  if (!grid) return;
  
  const src = buildImageSrc(item);
  if (!src) return;
  
  const desc = (typeof item === 'object' && item.descricao) ? item.descricao : 
               (typeof item === 'object' && item.description) ? item.description : '';
  const category = (typeof item === 'object' && item.categoria) ? item.categoria : 
                   (typeof item === 'object' && item.category) ? item.category : 'PORTFOLIO';
  const title = (typeof item === 'object' && item.titulo) ? item.titulo : 
                (typeof item === 'object' && item.title) ? item.title : `Trabalho ${index + 1}`;
  
  const portfolioItem = document.createElement('div');
  portfolioItem.className = 'portfolio-item';
  
  portfolioItem.innerHTML = `
    <div class="portfolio-image">
      <img src="${src}" alt="${title}" loading="lazy">
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
  if (!grid) return;
  
  const lista = await fetchPortfolioList();
  
  if (lista.length > 0) {
    grid.innerHTML = '';
    
    const portfolioImages = lista.slice(0, 6);
    portfolioImages.forEach((item, index) => inserirImagemPortfolio(item, index));
    
    console.log('[initPortfolio] portfolio carregado com', portfolioImages.length, 'imagens');
  } else {
    // Manter imagens estáticas se não houver imagens no backend
    console.log('[initPortfolio] usando imagens estáticas (backend vazio)');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    portfolioItems.forEach(item => {
      item.addEventListener('click', () => {
        item.style.transform = 'scale(0.98)';
        setTimeout(() => {
          item.style.transform = '';
        }, 200);
      });
    });
  }
}
