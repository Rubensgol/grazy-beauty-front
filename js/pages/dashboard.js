// Script para atualizar métricas do dashboard
import { adicionarNotificacao } from '../modals/notificacoes.js';
import { fetchWithAuth } from '../configuracao/http.js';

export async function buscarMetricasDashboard() {
  try {
    const response = await fetchWithAuth('/api/transacoes/valores');
    if (response.ok) {
      const valores = await response.json();
      atualizarMetricas(valores);
    } else {
      adicionarNotificacao('Erro ao buscar métricas do dashboard: ' + response.statusText, 'error');
    }
  } catch (err) {
    adicionarNotificacao('Erro de conexão ao buscar métricas do dashboard: ' + err.message, 'error');
  }
  buscarEstatisticaAgendamentosMes();
}

async function buscarEstatisticaAgendamentosMes() {
  const el = document.getElementById('agendamentos-mes');
  if (!el) return;
  try {
    const res = await fetchWithAuth('/api/agendamentos/estatistica/mes');
    if (!res.ok) throw new Error('Falha estatística agendamentos');
    let json = await res.json();
    // Se resposta tem propriedade 'data' (mesmo que 0), desembrulha
    if (json && Object.prototype.hasOwnProperty.call(json, 'data')) json = json.data;
    let total;
    if (json != null && typeof json === 'object' && !Array.isArray(json)) {
      if (Object.prototype.hasOwnProperty.call(json, 'total')) total = json.total;
      else if (Object.prototype.hasOwnProperty.call(json, 'qtd')) total = json.qtd;
      else if (Object.prototype.hasOwnProperty.call(json, 'count')) total = json.count;
    }
    if (total === undefined) {
      // Se json for número simples
      if (typeof json === 'number') total = json;
      else if (typeof json === 'string' && /^\d+$/.test(json)) total = Number(json);
    }
    el.textContent = (total !== undefined && total !== null) ? total : '0';
  } catch (err) {
    console.warn('[dashboard] estatística mês não carregada', err.message);
  }
}

function atualizarMetricas(valores) {
  const faturamentoEl = document.getElementById('faturamento-mes');
  const despesasEl = document.getElementById('despesas-mes');

  // Suporta backend que retorna 'receitaTotal' ou 'receitasTotais'
  const receitaValue = (valores.receitaTotal !== undefined) ? valores.receitaTotal : valores.receitasTotais;
  if (faturamentoEl && receitaValue !== undefined) {
    faturamentoEl.textContent = `R$ ${Number(receitaValue).toFixed(2).replace('.', ',')}`;
  }

  const despesasValue = (valores.despesasTotais !== undefined) ? valores.despesasTotais : valores.despesasTotal;
  if (despesasEl && despesasValue !== undefined) {
    despesasEl.textContent = `R$ ${Number(despesasValue).toFixed(2).replace('.', ',')}`;
  }
}

function formatarDataHora(valor) {
  if (!valor && valor !== 0) return '—';
  try {
    let d;
    if (Array.isArray(valor) && valor.length >= 5) {
      // Backend envia [ano, mes, dia, hora, minuto] com mês 1-12
      const [ano, mes, dia, hora, minuto] = valor;
      d = new Date(ano, (mes - 1), dia, hora || 0, minuto || 0, 0, 0);
    } else if (typeof valor === 'string') {
      d = new Date(valor);
    } else if (valor && typeof valor === 'object' && valor.ano) {
      // Caso alternativo: objeto {ano, mes, dia, hora, minuto}
      const { ano, mes, dia, hora = 0, minuto = 0 } = valor;
      d = new Date(ano, (mes - 1), dia, hora, minuto, 0, 0);
    }
    if (!d || isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,'0');
    const mi = String(d.getMinutes()).padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  } catch { return '—'; }
}

function badgeStatus(statusRaw) {
  const s = (statusRaw || '').toLowerCase();
  const map = {
    confirmado: 'bg-green-100 text-green-700',
    concluido: 'bg-green-100 text-green-700',
    pendente: 'bg-yellow-100 text-yellow-700',
    cancelado: 'bg-red-100 text-red-600'
  };
  const cls = map[s] || 'bg-gray-100 text-gray-600';
  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}">${statusRaw || '—'}</span>`;
}

function normalizarAgendamento(a = {}) {
  if (!a || typeof a !== 'object') return {};
  const id = a.id || a.idAgendamento || a.agendamentoId || null;
  const usuario = a.usuario || a.cliente || null;
  const servico = a.servico || a.servicoObj || null;
  const clienteNome = a.clienteNome || (usuario && (usuario.nome || usuario.name)) || a.nomeCliente || 'Cliente';
  const servicoNome = a.servicoNome || (servico && (servico.nome || servico.name)) || a.nomeServico || 'Serviço';
  const dataHoraRaw = a.dataHora || a.data_hora || a.data || a.dataISO || null;
  const statusRaw = (a.status || a.situacao || 'PENDENTE');
  const obs = a.observacoes || a.obs || null;
  return { id, clienteNome, servicoNome, dataHora: dataHoraRaw, status: statusRaw, obs, usuario, servico, _raw: a };
}

function ehStatusFinalizado(status) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === 'concluido' || s === 'concluído' || s === 'finalizado' || s === 'cancelado';
}

function agendamentoEhAtivo(raw) {
  const st = raw?.status || raw?.situacao;
  return !ehStatusFinalizado(st);
}

function criarCardAgendamento(aRaw) {
  const ag = normalizarAgendamento(aRaw);
  const dataHora = formatarDataHora(ag.dataHora);
  const status = badgeStatus(ag.status);
  const iniciais = ag.clienteNome.substring(0,2).toUpperCase();
  // Guardar json bruto em dataset para uso no editar (limitado tamanho); fallback: disparar fetch detalhado futuramente
  const encoded = encodeURIComponent(JSON.stringify({id: ag.id, usuario: ag.usuario, servico: ag.servico, dataHora: ag.dataHora, obs: ag.obs, status: ag.status}));
  return `<div class="ag-card group relative bg-white/60 backdrop-blur-sm border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3" data-agendamento-id="${ag.id || ''}" data-agendamento='${encoded}'>
    <div class="flex items-start gap-3">
      <div class="h-10 w-10 rounded-full bg-[var(--accent)] bg-opacity-20 flex items-center justify-center text-[var(--accent)] font-semibold text-sm">${iniciais}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-gray-800 truncate" title="${ag.clienteNome}">${ag.clienteNome}</p>
        <p class="text-[11px] text-gray-500 truncate" title="${ag.servicoNome}">${ag.servicoNome}</p>
      </div>
      <div class="flex flex-col items-end gap-1">
        ${status}
        <button class="open-payment-modal-button hidden group-hover:inline-flex text-[10px] bg-gray-700 text-white px-2 py-1 rounded-full">Finalizar</button>
      </div>
    </div>
    <div class="flex items-center justify-between text-[11px] text-gray-600">
      <span class="flex items-center gap-1"><svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>${dataHora}</span>
      <div class="flex gap-1">
        <button class="text-[10px] px-2 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 btn-cancelar-agendamento" title="Cancelar agendamento">Cancelar</button>
        <button class="text-[10px] px-2 py-1 rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] btn-editar-agendamento">Editar</button>
      </div>
    </div>
  </div>`;
}

function inserirOuAtualizarCardAgendamento(aRaw) {
  const ag = normalizarAgendamento(aRaw);
  const grid = document.getElementById('agendamentos-grid');
  const empty = document.getElementById('agendamentos-empty');
  if (!grid) return;
  // Se status finalizado/cancelado: remover card existente (se houver) e sair
  if (ehStatusFinalizado(ag.status)) {
    if (ag.id) {
      const existing = grid.querySelector(`[data-agendamento-id="${ag.id}"]`);
      if (existing) existing.remove();
      if (!grid.querySelector('.ag-card') && empty) empty.classList.remove('hidden');
    }
    return;
  }
  if (!ag.id) {
    // Sem id: apenas prepend provisório
    grid.insertAdjacentHTML('afterbegin', criarCardAgendamento(ag));
  } else {
    const existing = grid.querySelector(`[data-agendamento-id="${ag.id}"]`);
    const html = criarCardAgendamento(ag);
    if (existing) existing.outerHTML = html; else grid.insertAdjacentHTML('afterbegin', html);
  }
  if (empty) empty.classList.add('hidden');
}

async function carregarAgendamentosDashboard() {
  const grid = document.getElementById('agendamentos-grid');
  const empty = document.getElementById('agendamentos-empty');
  if (!grid) return;
  try {
    const res = await fetchWithAuth('/api/agendamentos?limit=12&proximos=true', { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao buscar agendamentos');
    let data = await res.json();
    if (data && data.data) data = data.data;
    if (!Array.isArray(data)) data = [];
  const ativos = data.filter(agendamentoEhAtivo);
  grid.innerHTML = ativos.map(criarCardAgendamento).join('');
  if (empty) empty.classList.toggle('hidden', ativos.length > 0);
  } catch (err) {
    console.error('[dashboard] erro carregando agendamentos', err);
    if (empty) empty.classList.remove('hidden');
  }
}

// Atualização em tempo real de novo agendamento
window.addEventListener('agendamento:adicionado', (e) => {
  const ag = e.detail; if (!ag) return;
  inserirOuAtualizarCardAgendamento(ag);
});

// Atualização de agendamento existente
window.addEventListener('agendamento:atualizado', (e) => {
  const ag = e.detail; if (!ag) return;
  inserirOuAtualizarCardAgendamento(ag);
});

// Delegar clique no botão editar para disparar evento agendamento:editar
// Função para resetar todos os campos do modal de agendamento
if (!window.__dashboardAgEditDelegated) {
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest && ev.target.closest('.btn-editar-agendamento');
    if (!btn) return;
    const card = btn.closest('.ag-card');
    if (!card) return;
    let data;
    try { data = card.getAttribute('data-agendamento'); if (data) data = JSON.parse(decodeURIComponent(data)); } catch { data = null; }
    if (!data || !data.id) {
      return;
    }
    // Limpar campo de observações do modal antes de disparar evento de edição
    setTimeout(() => {
      const modal = document.getElementById('modal-agendamento');
      if (modal) {
        const inputObs = modal.querySelector('[name="observacoes"], [name="obs"]');
        if (inputObs) inputObs.value = data.obs || '';
      }
    }, 100);
    window.dispatchEvent(new CustomEvent('agendamento:editar', { detail: data }));
  });
  window.__dashboardAgEditDelegated = true;
}

// Delegar clique no botão Cancelar agendamento
if (!window.__dashboardAgCancelDelegated) {
  document.addEventListener('click', async (ev) => {
    const cancelBtn = ev.target.closest && ev.target.closest('.btn-cancelar-agendamento');
    if (!cancelBtn) return;
    const card = cancelBtn.closest('.ag-card');
    if (!card) return;
    let data;
    try { data = card.getAttribute('data-agendamento'); if (data) data = JSON.parse(decodeURIComponent(data)); } catch { data = null; }
    if (!data || !data.id) return;
    
    // Importar módulos necessários
    const { confirmarAcao } = await import('../modals/confirmar-acao.js');
    const { fetchWithAuth } = await import('../configuracao/http.js');
    const { adicionarNotificacao } = await import('../modals/notificacoes.js');
    
    // Confirmar cancelamento
    const confirmado = await confirmarAcao(
      'Cancelar Agendamento',
      `Tem certeza que deseja cancelar o agendamento de ${data.usuario?.nome || 'este cliente'}?`,
      'warning'
    );
    
    if (!confirmado) return;
    
    try {
      const response = await fetchWithAuth(`/api/agendamentos/${data.id}/cancelar`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        adicionarNotificacao('Agendamento cancelado com sucesso', 'success');
        // Remover card do dashboard
        card.remove();
        // Disparar evento para outras páginas atualizarem
        window.dispatchEvent(new CustomEvent('agendamento:cancelado', { detail: { id: data.id } }));
      } else {
        const errorText = await response.text().catch(() => response.statusText);
        adicionarNotificacao(`Erro ao cancelar agendamento: ${errorText}`, 'error');
      }
    } catch (error) {
      adicionarNotificacao('Erro de conexão ao cancelar agendamento', 'error');
    }
  });
  window.__dashboardAgCancelDelegated = true;
}

// Delegar clique no botão Finalizar
if (!window.__dashboardAgFinishDelegated) {
  document.addEventListener('click', async (ev) => {
    const finishBtn = ev.target.closest && ev.target.closest('.open-payment-modal-button');
    if (!finishBtn) return;
    const card = finishBtn.closest('.ag-card');
    if (!card) return;
    let data;
    try { data = card.getAttribute('data-agendamento'); if (data) data = JSON.parse(decodeURIComponent(data)); } catch { data = null; }
    if (!data || !data.id) return;
    // Garantir modal de pagamento carregado
    if (!document.getElementById('payment-modal')) {
      const mod = await import('../modals/payment.js');
      if (mod.carregarModalPayment) await mod.carregarModalPayment();
    }
    window.dispatchEvent(new CustomEvent('pagamento:abrir', { detail: data }));
  });
  window.__dashboardAgFinishDelegated = true;
}

// Inicializar quando a página for exibida
window.addEventListener('DOMContentLoaded', () => {
  // Se o dashboard já estiver no DOM, buscar métricas
  const dashboard = document.getElementById('dashboard');
  if (dashboard && !dashboard.classList.contains('hidden')) {
    buscarMetricasDashboard();
    carregarAgendamentosDashboard();
  }

  // ...existing code...

  // Observar inserção da página se carregada dinamicamente
  const pagesContainer = document.getElementById('pages-container');
  if (pagesContainer) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.id === 'dashboard') { buscarMetricasDashboard(); carregarAgendamentosDashboard(); }
        });
      });
    });
    observer.observe(pagesContainer, { childList: true });
  }
});
