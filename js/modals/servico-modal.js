import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from './notificacoes.js';
import { LOG } from '../configuracao/logger.js';

export async function ensureServicoModalIsLoaded() {
  if (document.getElementById('servico-modal')) {
    return;
  }

  try {
    LOG.debug('[servico-modal] carregando HTML do modal');
    const resp = await fetch('modals/servico.html');
    const html = await resp.text();
    
    let container = document.getElementById('modals-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modals-container';
      document.body.appendChild(container);
    }
    
    container.insertAdjacentHTML('beforeend', html);
    LOG.debug('[servico-modal] wireando modal');
    wireServicoModal();
  } catch (e) {
    LOG.error('[servico-modal] Erro ao carregar:', e);
    adicionarNotificacao('Erro ao carregar modal de serviço', 'error');
    throw e;
  }
}

// Carrega o modal HTML e inicia as listeners
export async function carregarEAbrirModalServico() {
  await ensureServicoModalIsLoaded();
  openServicoModal();
}

export function wireServicoModal() {
  const modal = document.getElementById('servico-modal');
  const form = document.getElementById('servico-form');
  const closeBtn = document.getElementById('close-servico-modal-button');
  const cancelBtn = document.getElementById('cancel-servico-modal-button');
  const title = modal.querySelector('h2');
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!form) {
    LOG.error('[servico-modal] formulário não encontrado');
    return;
  }

  // Fechar modal
  function closeServicoModal() {
    if (!modal) return;
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.style.zIndex = '';
      // Limpar form ao fechar
      form.reset();
      delete form.dataset.editingId;
      if (title) title.textContent = 'Adicionar Serviço';
      if (submitBtn) {
        submitBtn.textContent = 'Salvar';
        delete submitBtn.dataset.originalText;
      }
      // Esconder info de lucro e botão calcular
      const lucroInfo = document.getElementById('servico-lucro-info');
      const calcularBtn = document.getElementById('calcular-preco-btn');
      if (lucroInfo) lucroInfo.classList.add('hidden');
      if (calcularBtn) calcularBtn.classList.add('hidden');
      // Resetar select para valor padrão
      const custoTipoSelect = document.getElementById('servico-custo-tipo');
      if (custoTipoSelect) custoTipoSelect.value = 'absoluto';
    }, 300);
  }

  // Calcular e mostrar lucro em tempo real
  function calcularLucro() {
    const custoInput = document.getElementById('servico-custo');
    const custoTipoSelect = document.getElementById('servico-custo-tipo');
    const precoInput = document.getElementById('servico-preco');
    const lucroInfo = document.getElementById('servico-lucro-info');
    const lucroValor = document.getElementById('servico-lucro-valor');
    const lucroMargem = document.getElementById('servico-lucro-margem');
    const lucroStatus = document.getElementById('servico-lucro-status');
    
    if (!custoInput || !precoInput || !lucroInfo) return;
    
    const custoRaw = parseFloat(custoInput.value) || 0;
    const custoTipo = custoTipoSelect?.value || 'absoluto';
    const preco = parseFloat(precoInput.value) || 0;
    
    // Calcular custo real (se percentual, calcular a partir do preço)
    let custoReal = custoRaw;
    if (custoTipo === 'percentual' && preco > 0) {
      custoReal = (custoRaw / 100) * preco;
    }
    
    if (custoReal > 0 && preco > 0) {
      const lucro = preco - custoReal;
      const margem = ((lucro / preco) * 100).toFixed(1);
      
      lucroValor.textContent = 'R$ ' + lucro.toFixed(2).replace('.', ',');
      lucroMargem.textContent = margem;
      lucroInfo.classList.remove('hidden');
      
      // Mudar cor e status baseado na margem
      if (margem < 20) {
        lucroInfo.className = 'p-3 bg-red-50 border border-red-200 rounded-lg';
        lucroStatus.textContent = 'Baixa';
        lucroStatus.className = 'text-xs px-2 py-1 rounded-full bg-red-100 text-red-700';
      } else if (margem < 40) {
        lucroInfo.className = 'p-3 bg-yellow-50 border border-yellow-200 rounded-lg';
        lucroStatus.textContent = 'Razoável';
        lucroStatus.className = 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700';
      } else {
        lucroInfo.className = 'p-3 bg-green-50 border border-green-200 rounded-lg';
        lucroStatus.textContent = 'Ótimo';
        lucroStatus.className = 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700';
      }
    } else {
      lucroInfo.classList.add('hidden');
    }
  }
  
  // Calcular preço sugerido a partir de custo e margem
  function calcularPrecoSugerido() {
    const custoInput = document.getElementById('servico-custo');
    const custoTipoSelect = document.getElementById('servico-custo-tipo');
    const margemInput = document.getElementById('servico-margem');
    const precoInput = document.getElementById('servico-preco');
    
    if (!custoInput || !margemInput || !precoInput) return;
    
    const custoRaw = parseFloat(custoInput.value) || 0;
    const custoTipo = custoTipoSelect?.value || 'absoluto';
    const margemDesejada = parseFloat(margemInput.value) || 40;
    
    if (custoRaw > 0 && margemDesejada > 0 && margemDesejada < 100) {
      if (custoTipo === 'absoluto') {
        // Preço = Custo / (1 - Margem/100)
        const precoSugerido = custoRaw / (1 - margemDesejada / 100);
        precoInput.value = precoSugerido.toFixed(2);
      } else {
        // Se custo é percentual, não podemos calcular sem um preço base
        // Nesse caso, deixamos o usuário definir manualmente
      }
      calcularLucro();
    }
  }
  
  // Mostrar/ocultar botão de calcular baseado no preenchimento
  function atualizarBotaoCalcular() {
    const custoInput = document.getElementById('servico-custo');
    const custoTipoSelect = document.getElementById('servico-custo-tipo');
    const margemInput = document.getElementById('servico-margem');
    const calcularBtn = document.getElementById('calcular-preco-btn');
    
    if (!calcularBtn) return;
    
    const custo = parseFloat(custoInput?.value) || 0;
    const custoTipo = custoTipoSelect?.value || 'absoluto';
    const margem = parseFloat(margemInput?.value) || 0;
    
    // Mostrar botão apenas se custo absoluto e margem estiverem preenchidos
    if (custo > 0 && margem > 0 && custoTipo === 'absoluto') {
      calcularBtn.classList.remove('hidden');
    } else {
      calcularBtn.classList.add('hidden');
    }
  }

  // Adicionar listeners para cálculo de lucro
  const custoInput = document.getElementById('servico-custo');
  const custoTipoSelect = document.getElementById('servico-custo-tipo');
  const margemInput = document.getElementById('servico-margem');
  const precoInput = document.getElementById('servico-preco');
  const calcularBtn = document.getElementById('calcular-preco-btn');
  
  if (custoInput) {
    custoInput.addEventListener('input', () => {
      calcularLucro();
      atualizarBotaoCalcular();
    });
  }
  if (custoTipoSelect) {
    custoTipoSelect.addEventListener('change', () => {
      calcularLucro();
      atualizarBotaoCalcular();
    });
  }
  if (margemInput) {
    margemInput.addEventListener('input', atualizarBotaoCalcular);
  }
  if (precoInput) {
    precoInput.addEventListener('input', calcularLucro);
  }
  if (calcularBtn) {
    calcularBtn.addEventListener('click', calcularPrecoSugerido);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeServicoModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeServicoModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeServicoModal();
    });
  }

  // Helper para fazer upload de imagem
  async function uploadImagem(file) {
    if (!file) return null;
    
    LOG.debug('[servico-modal] iniciando upload de imagem:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('forServico', 'true');

    try {
      const res = await fetchWithAuth('/api/images/upload', {
        method: 'POST',
        body: formData
        // NÃO definir Content-Type: FormData é enviado automaticamente
      });

      const json = await res.json();
      LOG.debug('[servico-modal] upload resposta:', res.status, json);

      if (!res.ok) {
        throw new Error(json.message || `Status ${res.status}`);
      }

      // Retorna o storedFilename ou filename
      const storedFilename = json.storedFilename || json.filename || json.data;
      LOG.debug('[servico-modal] storedFilename retornado:', storedFilename);
      return storedFilename;
    } catch (err) {
      LOG.error('[servico-modal] erro no upload:', err);
      throw new Error('Erro ao fazer upload da imagem: ' + err.message);
    }
  }

  // Salvar servico (POST para novo, PUT para editar)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    LOG.debug('[servico-modal] submit form');
    
    const fd = new FormData(form);
    const editingId = form.dataset.editingId;
    
    const horas = parseInt(fd.get('servico-duracao-horas'), 10) || 0;
    const minutos = parseInt(fd.get('servico-duracao-minutos'), 10) || 0;
    const duracaoMinutos = (horas * 60) + minutos;

    const exibirLandingCheckbox = document.getElementById('servico-exibir-landing');
    const custoTipoSelect = document.getElementById('servico-custo-tipo');
    
    // Calcular custo real (converter percentual para absoluto)
    const preco = parseFloat(fd.get('servico-preco')) || 0;
    let custoRaw = parseFloat(fd.get('servico-custo')) || 0;
    const custoTipo = custoTipoSelect?.value || 'absoluto';
    
    let custoFinal = null;
    if (custoRaw > 0 && preco > 0) {
      if (custoTipo === 'percentual') {
        custoFinal = (custoRaw / 100) * preco;
      } else {
        custoFinal = custoRaw;
      }
    } else if (custoRaw > 0) {
      custoFinal = custoRaw;
    }

    const data = {
      nome: fd.get('servico-nome'),
      descricao: fd.get('servico-descricao') || null,
      preco: preco,
      custo: custoFinal,
      duracaoMinutos: duracaoMinutos,
      exibirLanding: exibirLandingCheckbox ? exibirLandingCheckbox.checked : true,
    };

    const imagemFile = fd.get('servico-imagem');

    try {
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Salvando...';
      submitBtn.disabled = true;

      // Se há uma nova imagem, fazer upload primeiro
      if (imagemFile && imagemFile.size > 0) {
        submitBtn.textContent = 'Enviando imagem...';
        const storedFilename = await uploadImagem(imagemFile);
        data.imageStoredFilename = storedFilename;
        LOG.debug('[servico-modal] dados agora contêm imageStoredFilename:', data.imageStoredFilename);
      }

      submitBtn.textContent = 'Salvando...';
      const method = editingId ? 'PUT' : 'POST';
      const urlPath = editingId ? `/api/servicos/${editingId}` : '/api/servicos';
      
      LOG.debug('[servico-modal] salvando', method, urlPath, data);
      const res = await fetchWithAuth(urlPath, {
        method,
        body: JSON.stringify(data)
      });

      const json = await res.json().catch(() => null);
      LOG.debug('[servico-modal] resposta', res.status, json);

      if (!res.ok) {
        const msg = json && json.message ? json.message : `Status ${res.status}`;
        throw new Error(msg);
      }

      const saved = (json && json.data) || (json && json.servico) || data;
      
      window.dispatchEvent(new CustomEvent(
        editingId ? 'servico:atualizado' : 'servico:adicionado',
        { detail: saved }
      ));

      adicionarNotificacao(
        `Serviço ${editingId ? 'atualizado' : 'adicionado'} com sucesso`,
        'success'
      );

      setTimeout(() => {
        closeServicoModal();
      }, 800);

    } catch (err) {
      LOG.error('[servico-modal] erro ao salvar:', err);
      adicionarNotificacao('Erro ao salvar serviço: ' + err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitBtn.dataset.originalText) {
          submitBtn.textContent = submitBtn.dataset.originalText;
        }
      }
    }
  });

  // Editar servico (disparado ao clicar em "Editar")
  window.addEventListener('servico:editar', (ev) => {
    const servico = ev.detail;
    if (!servico || !servico.id) {
      LOG.warn('[servico-modal] servico:editar sem ID válido');
      return;
    }

    LOG.debug('[servico-modal] editando servico:', servico.id);
    
    if (title) title.textContent = 'Editar Serviço';
    if (submitBtn) submitBtn.textContent = 'Atualizar';
    
    form.dataset.editingId = servico.id;
    form.querySelector('#servico-nome').value = servico.nome || '';
    form.querySelector('#servico-descricao').value = servico.descricao || '';
    form.querySelector('#servico-preco').value = servico.preco || '';
    
    // Preencher custo
    const custoInput = form.querySelector('#servico-custo');
    if (custoInput) custoInput.value = servico.custo || '';
    
    // Preencher checkbox exibirLanding
    const exibirLandingCheckbox = form.querySelector('#servico-exibir-landing');
    if (exibirLandingCheckbox) {
      exibirLandingCheckbox.checked = servico.exibirLanding !== false;
    }

    // Preencher duração a partir de duracaoMinutos
    let horas = 0;
    let minutos = 0;
    
    if (servico.duracaoMinutos !== undefined && servico.duracaoMinutos !== null) {
      horas = Math.floor(servico.duracaoMinutos / 60);
      minutos = servico.duracaoMinutos % 60;
    } else if (servico.duracao) {
      // Fallback para parsing de string (formato antigo "1h 30min")
      const horasMatch = servico.duracao.match(/(\d+)h/);
      const minutosMatch = servico.duracao.match(/(\d+)min/);
      horas = horasMatch ? parseInt(horasMatch[1], 10) : 0;
      minutos = minutosMatch ? parseInt(minutosMatch[1], 10) : 0;
    }

    form.querySelector('#servico-duracao-horas').value = horas;
    form.querySelector('#servico-duracao-minutos').value = minutos;
    
    // Calcular lucro após preencher campos
    const custoVal = parseFloat(servico.custo) || 0;
    const precoVal = parseFloat(servico.preco) || 0;
    if (custoVal > 0 && precoVal > 0) {
      setTimeout(() => {
        const event = new Event('input', { bubbles: true });
        if (custoInput) custoInput.dispatchEvent(event);
      }, 100);
    }

    openServicoModal();
  });
}

export function openServicoModal() {
  const modal = document.getElementById('servico-modal');
  if (!modal) {
    LOG.error('[servico-modal] openServicoModal: modal não encontrado');
    return;
  }

  try {
    document.body.appendChild(modal);
  } catch (e) {
    // modal já está no DOM
  }

  modal.style.zIndex = '99999';
  modal.classList.remove('hidden');
  modal.offsetHeight;
  setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

export function closeServicoModal() {
  const modal = document.getElementById('servico-modal');
  if (!modal) return;
  
  modal.classList.add('opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.style.zIndex = '';
  }, 300);
}
