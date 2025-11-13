// Script para página de Conteúdo do Site
import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { LOG } from '../configuracao/logger.js';
import { apiUrl } from '../configuracao/config.js';

// Estado atual do conteúdo
let conteudoAtual = {
  hero: {
    titulo: '',
    subtitulo: '',
    imagemUrl: ''
  },
  about: {
    titulo: '',
    subtitulo: '',
    texto: '',
    imagemUrl: '',
    stats: [
      { numero: '', texto: '' },
      { numero: '', texto: '' },
      { numero: '', texto: '' }
    ]
  }
};

// Arquivos selecionados para upload
let heroImagemFile = null;
let aboutImagemFile = null;

/**
 * Buscar conteúdo atual do servidor
 */
async function buscarConteudo() {
  LOG.info('📋 Buscando conteúdo do site...');
  try {
    const response = await fetchWithAuth('/api/conteudo');
    
    if (response.ok) {
      const resultado = await response.json();
      LOG.debug('✅ Resposta recebida:', resultado);
      
      const dados = resultado.data || resultado;
      
      // Atualizar estado local
      if (dados.hero) {
        conteudoAtual.hero = {
          titulo: dados.hero.titulo || '',
          subtitulo: dados.hero.subtitulo || '',
          imagemUrl: dados.hero.imagemUrl || dados.hero.imagem || ''
        };
      }
      
      if (dados.about) {
        conteudoAtual.about = {
          titulo: dados.about.titulo || '',
          subtitulo: dados.about.subtitulo || '',
          texto: dados.about.texto || '',
          imagemUrl: dados.about.imagemUrl || dados.about.imagem || '',
          stats: dados.about.stats || [
            { numero: '', texto: '' },
            { numero: '', texto: '' },
            { numero: '', texto: '' }
          ]
        };
      }
      
      LOG.debug('💾 Estado local atualizado:', conteudoAtual);
      
      // Atualizar interface
      atualizarInterface();
    } else {
      LOG.warn('⚠️ Erro ao buscar conteúdo:', response.status);
      adicionarNotificacao('Erro ao carregar conteúdo', 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao buscar conteúdo:', error);
    adicionarNotificacao('Erro de conexão ao buscar conteúdo', 'error');
  }
}

/**
 * Atualizar interface com valores atuais
 */
function atualizarInterface() {
  // Hero
  const heroTitulo = document.getElementById('hero-titulo');
  const heroSubtitulo = document.getElementById('hero-subtitulo');
  const heroImagemPreview = document.getElementById('hero-imagem-preview');
  
  if (heroTitulo) heroTitulo.value = conteudoAtual.hero.titulo;
  if (heroSubtitulo) heroSubtitulo.value = conteudoAtual.hero.subtitulo;
  
  if (heroImagemPreview && conteudoAtual.hero.imagemUrl) {
    const imgUrl = conteudoAtual.hero.imagemUrl.startsWith('http') 
      ? conteudoAtual.hero.imagemUrl 
      : apiUrl(`/api/images/download/${encodeURIComponent(conteudoAtual.hero.imagemUrl)}`);
    heroImagemPreview.innerHTML = `<img src="${imgUrl}" alt="Hero" class="w-full h-full object-cover">`;
  }
  
  // About
  const aboutTitulo = document.getElementById('about-titulo');
  const aboutSubtitulo = document.getElementById('about-subtitulo');
  const aboutTexto = document.getElementById('about-texto');
  const aboutImagemPreview = document.getElementById('about-imagem-preview');
  
  if (aboutTitulo) aboutTitulo.value = conteudoAtual.about.titulo;
  if (aboutSubtitulo) aboutSubtitulo.value = conteudoAtual.about.subtitulo;
  if (aboutTexto) aboutTexto.value = conteudoAtual.about.texto;
  
  if (aboutImagemPreview && conteudoAtual.about.imagemUrl) {
    const imgUrl = conteudoAtual.about.imagemUrl.startsWith('http') 
      ? conteudoAtual.about.imagemUrl 
      : apiUrl(`/api/images/download/${encodeURIComponent(conteudoAtual.about.imagemUrl)}`);
    aboutImagemPreview.innerHTML = `<img src="${imgUrl}" alt="About" class="w-full h-full object-cover">`;
  }
  
  // Stats
  const stats = conteudoAtual.about.stats || [];
  for (let i = 0; i < 3; i++) {
    const numeroInput = document.getElementById(`about-stat${i + 1}-numero`);
    const textoInput = document.getElementById(`about-stat${i + 1}-texto`);
    
    if (numeroInput && stats[i]) numeroInput.value = stats[i].numero || '';
    if (textoInput && stats[i]) textoInput.value = stats[i].texto || '';
  }
}

/**
 * Configurar preview de imagem
 */
function setupImagePreview(inputId, previewId, fileVariable) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(inputId.replace('-upload', '-button'));
  const preview = document.getElementById(previewId);
  
  if (button && input) {
    button.addEventListener('click', () => input.click());
  }
  
  if (input && preview) {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Armazenar arquivo
        if (inputId === 'hero-imagem-upload') {
          heroImagemFile = file;
        } else if (inputId === 'about-imagem-upload') {
          aboutImagemFile = file;
        }
        
        // Preview
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-full h-full object-cover">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

/**
 * Fazer upload de imagem
 */
async function uploadImagem(file) {
  if (!file) return null;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetchWithAuth('/api/images/upload', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const resultado = await response.json();
      LOG.debug('✅ Upload realizado:', resultado);
      return resultado.storedFilename || resultado.filename;
    } else {
      LOG.error('❌ Erro no upload:', response.status);
      return null;
    }
  } catch (error) {
    LOG.error('❌ Erro ao fazer upload:', error);
    return null;
  }
}

/**
 * Salvar Hero
 */
async function salvarHero() {
  LOG.info('💾 Salvando Hero...');
  
  const titulo = document.getElementById('hero-titulo')?.value || '';
  const subtitulo = document.getElementById('hero-subtitulo')?.value || '';
  
  let imagemUrl = conteudoAtual.hero.imagemUrl;
  
  // Upload de nova imagem se selecionada
  if (heroImagemFile) {
    const uploaded = await uploadImagem(heroImagemFile);
    if (uploaded) {
      imagemUrl = uploaded;
      heroImagemFile = null;
    } else {
      adicionarNotificacao('Erro ao fazer upload da imagem', 'error');
      return;
    }
  }
  
  const dados = {
    titulo,
    subtitulo,
    imagemUrl
  };
  
  LOG.debug('📤 Dados Hero a enviar:', dados);
  
  const botao = document.getElementById('hero-save-button');
  const textoOriginal = botao?.textContent || '';
  
  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Salvando...';
    }
    
    const response = await fetchWithAuth('/api/conteudo/hero', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });
    
    if (response.ok) {
      const resultado = await response.json();
      LOG.info('✅ Hero salvo com sucesso:', resultado);
      
      conteudoAtual.hero = dados;
      atualizarInterface();
      
      adicionarNotificacao('Hero salvo com sucesso!', 'success');
    } else {
      const errorText = await response.text().catch(() => response.statusText);
      LOG.error('❌ Erro ao salvar:', response.status, errorText);
      adicionarNotificacao(`Erro ao salvar Hero: ${response.status}`, 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao salvar Hero:', error);
    adicionarNotificacao('Erro de conexão ao salvar Hero', 'error');
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }
}

/**
 * Salvar About
 */
async function salvarAbout() {
  LOG.info('💾 Salvando About...');
  
  const titulo = document.getElementById('about-titulo')?.value || '';
  const subtitulo = document.getElementById('about-subtitulo')?.value || '';
  const texto = document.getElementById('about-texto')?.value || '';
  
  let imagemUrl = conteudoAtual.about.imagemUrl;
  
  // Upload de nova imagem se selecionada
  if (aboutImagemFile) {
    const uploaded = await uploadImagem(aboutImagemFile);
    if (uploaded) {
      imagemUrl = uploaded;
      aboutImagemFile = null;
    } else {
      adicionarNotificacao('Erro ao fazer upload da imagem', 'error');
      return;
    }
  }
  
  // Coletar stats
  const stats = [];
  for (let i = 0; i < 3; i++) {
    const numero = document.getElementById(`about-stat${i + 1}-numero`)?.value || '';
    const textoStat = document.getElementById(`about-stat${i + 1}-texto`)?.value || '';
    stats.push({ numero, texto: textoStat });
  }
  
  const dados = {
    titulo,
    subtitulo,
    texto,
    imagemUrl,
    stats
  };
  
  LOG.debug('📤 Dados About a enviar:', dados);
  
  const botao = document.getElementById('about-save-button');
  const textoOriginal = botao?.textContent || '';
  
  try {
    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Salvando...';
    }
    
    const response = await fetchWithAuth('/api/conteudo/about', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });
    
    if (response.ok) {
      const resultado = await response.json();
      LOG.info('✅ About salvo com sucesso:', resultado);
      
      conteudoAtual.about = dados;
      atualizarInterface();
      
      adicionarNotificacao('About salvo com sucesso!', 'success');
    } else {
      const errorText = await response.text().catch(() => response.statusText);
      LOG.error('❌ Erro ao salvar:', response.status, errorText);
      adicionarNotificacao(`Erro ao salvar About: ${response.status}`, 'error');
    }
  } catch (error) {
    LOG.error('❌ Erro ao salvar About:', error);
    adicionarNotificacao('Erro de conexão ao salvar About', 'error');
  } finally {
    if (botao) {
      botao.disabled = false;
      botao.textContent = textoOriginal;
    }
  }
}

/**
 * Inicializar página de conteúdo
 */
export function initConteudo() {
  LOG.info('🚀 Inicializando página de conteúdo...');
  
  // Buscar conteúdo ao carregar
  buscarConteudo();
  
  // Configurar previews de imagem
  setupImagePreview('hero-imagem-upload', 'hero-imagem-preview');
  setupImagePreview('about-imagem-upload', 'about-imagem-preview');
  
  // Conectar botões de salvar
  const botaoSalvarHero = document.getElementById('hero-save-button');
  if (botaoSalvarHero) {
    botaoSalvarHero.addEventListener('click', salvarHero);
    LOG.debug('✅ Botão salvar Hero conectado');
  }
  
  const botaoSalvarAbout = document.getElementById('about-save-button');
  if (botaoSalvarAbout) {
    botaoSalvarAbout.addEventListener('click', salvarAbout);
    LOG.debug('✅ Botão salvar About conectado');
  }
  
  LOG.info('✅ Página de conteúdo inicializada');
}

// Inicializar quando a página de conteúdo for carregada dinamicamente
window.addEventListener('DOMContentLoaded', () => {
  LOG.debug('📋 DOM carregado, observando página de conteúdo');
  
  // Ouvir quando a página conteudo for carregada
  window.addEventListener('page:loaded', (event) => {
    if (event.detail && event.detail.page === 'conteudo') {
      LOG.info('🎯 Página conteúdo foi carregada');
      initConteudo();
    }
  });

  // Ouvir quando a página conteudo for mostrada
  window.addEventListener('page:shown', (event) => {
    if (event.detail && event.detail.page === 'conteudo') {
      LOG.debug('👁️ Página conteúdo está visível');
      buscarConteudo();
    }
  });

  // Verificar se a página já está carregada
  const paginaConteudo = document.getElementById('conteudo');
  if (paginaConteudo && !paginaConteudo.classList.contains('hidden')) {
    LOG.info('🎯 Página conteúdo já carregada e visível');
    initConteudo();
  }
});
