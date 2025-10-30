import { fetchWithAuth } from '../../js/configuracao/http.js';
import { apiUrl } from '../../js/configuracao/config.js';

// Função para buscar serviços do backend
async function fetchServicosList() {
  try {
    const res = await fetchWithAuth('/api/servicos');
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
    console.error('[fetchServicosList] erro:', err);
    return [];
  }
}

function buildImageUrl(servico) {
  const stored = servico.imageStoredFilename || servico.storedFilename || servico.stored_filename;
  if (!stored || stored === '' || stored === 'null' || stored === 'undefined') {
    console.debug('[buildImageUrl] imagem não disponível para serviço:', servico.id || servico.nome);
    return null;
  }
  return apiUrl(`/api/images/download/${encodeURIComponent(stored)}`);
}

function formatPreco(valor) {
  if (valor === null || valor === undefined || isNaN(Number(valor))) return 'Consulte';
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

function formatDuracao(servico) {
  if (servico.duracaoMinutos !== undefined && servico.duracaoMinutos !== null) {
    const minutosTotais = servico.duracaoMinutos;
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    
    if (horas > 0 && minutos > 0) {
      return `${horas}h ${minutos}min`;
    } else if (horas > 0) {
      return `${horas}h`;
    } else if (minutos > 0) {
      return `${minutos}min`;
    }
  }
  return servico.duracao || servico.tempo || 'A combinar';
}

function inserirServicoCard(servico) {
  const grid = document.querySelector('.services-grid');
  if (!grid) {
    console.warn('[inserirServicoCard] grid não encontrado');
    return;
  }
  
  const nome = servico.nome || servico.nomeServico || 'Serviço';
  const preco = servico.preco !== undefined ? servico.preco : servico.valor;
  const descricao = servico.descricao || servico.description || '';
  const duracao = formatDuracao(servico);
  
  const imgUrl = buildImageUrl(servico);
  const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Cpath fill="%23d1d5db" d="M150 100h100v80h-100z"/%3E%3Ccircle cx="180" cy="130" r="10" fill="%23e5e7eb"/%3E%3Cpath fill="%23d1d5db" d="M150 160l30-20 20 15 30-10v25h-80z"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="220" text-anchor="middle"%3ESem imagem%3C/text%3E%3C/svg%3E';
  
  const mensagemWhatsApp = encodeURIComponent(`Olá, gostaria de agendar o serviço: ${nome}`);
  
  const serviceCard = document.createElement('div');
  serviceCard.className = 'service-card';
  
  serviceCard.innerHTML = `
    <div class="service-image">
      <img src="${imgUrl || placeholderSvg}" alt="${nome}" loading="lazy" onerror="this.onerror=null; this.src='${placeholderSvg}'; this.style.opacity='0.6';">
    </div>
    <div class="service-header">
      <h3 class="service-title">${nome.toUpperCase()}</h3>
      <div class="service-meta">
        <span class="service-duration">${duracao}</span>
        <span class="service-price">${preco !== null && preco !== undefined ? 'A partir de ' + formatPreco(preco) : 'Consulte'}</span>
      </div>
    </div>
    <div class="service-content">
      <p class="service-description">
        ${descricao || 'Serviço personalizado de acordo com suas necessidades.'}
      </p>
      <button class="btn btn-primary btn-block" onclick="window.open('https://wa.me/5521976180101?text=${mensagemWhatsApp}', '_blank')">
        Agendar Agora
      </button>
    </div>
  `;
  
  grid.appendChild(serviceCard);
}

export async function initServicos() {
  const grid = document.querySelector('.services-grid');
  if (!grid) {
    console.warn('[initServicos] grid não encontrado');
    return;
  }
  
  // Buscar serviços do backend
  const lista = await fetchServicosList();
  
  if (lista.length > 0) {
    // Limpar grid antes de adicionar novos serviços
    grid.innerHTML = '';
    
    // Filtrar apenas serviços válidos
    const servicosValidos = lista.filter(servico => {
      return servico.nome || servico.nomeServico;
    });
    
    if (servicosValidos.length === 0) {
      console.warn('[initServicos] nenhum serviço válido encontrado');
      grid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem; grid-column: 1/-1;">Nenhum serviço disponível no momento.</p>';
      return;
    }
    
    servicosValidos.forEach(servico => inserirServicoCard(servico));
    
    console.log('[initServicos] serviços carregados:', servicosValidos.length);
  } else {
    console.log('[initServicos] backend sem serviços');
    grid.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem; grid-column: 1/-1;">Nenhum serviço disponível no momento.</p>';
  }
}
