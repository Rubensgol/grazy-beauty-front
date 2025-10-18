
function resetarCamposModalAgendamento(modal) {
  if (!modal) return;
  // Limpa campos comuns
  const campos = [
    '[name="data"]',
    '[name="hora"]',
    '[name="observacoes"]',
    '[name="obs"]',
    '[name="cliente"]',
    '[name="clienteNome"]',
    '[name="servico"]',
    '[name="servicoNome"]',
    '[name="usuario"]',
    '[name="status"]'
  ];
  campos.forEach(sel => {
    const el = modal.querySelector(sel);
    if (el) el.value = '';
  });
  // Limpa selects
  const selects = modal.querySelectorAll('select');
  selects.forEach(s => { s.selectedIndex = 0; });
}
import { carregarModalAgendamento } from '../modals/agendamento.js';
import { apiUrl } from '../configuracao/config.js';

let agendaDataAtual = new Date();
const INICIO_DIA_PADRAO = 8;   // 08:00
const FIM_DIA_PADRAO = 20;     // 20:00 (último slot inicia às 19:30)
const INTERVALO_MIN = 30;

// ===== Funções utilitárias perdidas (restauradas) =====
function sameDay(a,b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

async function carregarAgendamentosDia(d) {
  try {
    const url = apiUrl(`/api/agendamentos?data=${dataISO(d)}`);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let body = await res.json();
    let json = body?.data || body;
    if (!Array.isArray(json)) {
      return [];
    }
    const filtrados = json.filter(ag => {
      const raw = ag.dataHora || ag.data_hora || ag.data;
      let dataAg=null;
      if (Array.isArray(raw) && raw.length>=3) dataAg = new Date(raw[0], raw[1]-1, raw[2]);
      else if (typeof raw === 'string' && raw.includes('T')) { const dt=new Date(raw); if(!isNaN(dt)) dataAg=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()); }
      else if (typeof raw === 'string' && raw.includes('-')) { const p=raw.split('-'); if(p.length>=3) dataAg=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2])); }
      if(!dataAg||isNaN(dataAg)) return false;
      return sameDay(dataAg,d);
    });
    return filtrados;
  } catch (e) {
    return [];
  }
}

function preencherMiniSemana(baseDate) {
  const mini = document.getElementById('agenda-semana-mini');
  if (!mini) {
    return;
  }
  mini.innerHTML = '';
  const dia = baseDate.getDay(); // 0=Dom
  const deltaSeg = (dia === 0 ? -6 : 1 - dia);
  const segunda = new Date(baseDate); segunda.setDate(baseDate.getDate() + deltaSeg);
  const diasSemana = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  for (let i=0;i<7;i++) {
    const d = new Date(segunda); d.setDate(segunda.getDate()+i);
    const el = document.createElement('div');
    const hoje = sameDay(d, new Date());
    const ativo = sameDay(d, baseDate);
    const classes = [];
    if (ativo) classes.push('agenda-active');
    else if (hoje) classes.push('border');
    el.className = classes.join(' ');
    el.style.cursor = 'pointer';
    el.textContent = `${diasSemana[i]} ${d.getDate()}`;
    el.dataset.date = dataISO(d);
  el.addEventListener('click', () => { agendaDataAtual = d; atualizarAgendaDia(); });
    mini.appendChild(el);
  }
}

function renderAgendamentosDia(lista) {
  const timeline = document.getElementById('agenda-timeline'); 
  if (!timeline) {
    return;
  }
  
  if (getComputedStyle(timeline).position === 'static') timeline.style.position = 'relative';
  const rows = [...timeline.querySelectorAll('.agenda-row')];
  const getRowByTime = (t) => {
  return rows.find(r => r.querySelector('.agenda-time')?.textContent.trim() === t);
  };
  
  const baseContent = rows[0]?.querySelector('.agenda-content');
  let contentLeft = 0, contentWidth = 0;
  if (baseContent) {
    const rt = timeline.getBoundingClientRect();
    const rc = baseContent.getBoundingClientRect();
    contentLeft = rc.left - rt.left;
    contentWidth = rc.width;
  }
  
  // Remove blocos antigos
  const blocosAntigos = timeline.querySelectorAll('.appointment-block.absolute-block');
  blocosAntigos.forEach(el => el.remove());
  // Limpar classes de ocupação de todos os slots
  rows.forEach((row, index) => {
    row.classList.remove('slot-ocupado-parte');
    const cont = row.querySelector('.agenda-content');
    if (cont) {
      cont.classList.remove('slot-ocupado-parte', 'ocupado');
    }
  });
  (lista || []).forEach((ag, index) => {
    const horaInicioStr = extrairHoraAgendamento(ag);
    if (!horaInicioStr) {
      return;
    }
    
  const status = (ag.status || '').toLowerCase();
  if (['concluido','concluído','finalizado','cancelado'].includes(status)) return;
    
    const durMin = parseDuracaoMinutos(ag) || INTERVALO_MIN;
    const [hRaw, mRaw] = horaInicioStr.split(':').map(n => parseInt(n, 10));
    if (isNaN(hRaw) || isNaN(mRaw)) {
      return;
    }
    
    
    
    // Calcular posição e altura baseada em minutos absolutos
    const agendamentoStartMin = hRaw * 60 + mRaw;
    const agendamentoEndMin = agendamentoStartMin + durMin;
    
    
    
    // Encontrar o slot de início
    const startBucketMin = Math.floor(mRaw / INTERVALO_MIN) * INTERVALO_MIN;
    const startBucketStr = `${String(hRaw).padStart(2,'0')}:${String(startBucketMin).padStart(2,'0')}`;
    
    
    const startRow = getRowByTime(startBucketStr);
    if (!startRow) {
      return;
    }
    
    const slotHeight = startRow.offsetHeight || 48;
    
    
    // Calcular posição vertical baseada em minutos desde o primeiro slot realmente gerado (dinâmico)
    let dayStartMinutes = INICIO_DIA_PADRAO * 60; // fallback
    if (rows.length) {
      const firstTime = rows[0].querySelector('.agenda-time')?.textContent.trim();
      if (firstTime) {
        const [fh,fm] = firstTime.split(':').map(n=>parseInt(n,10));
        if(!isNaN(fh) && !isNaN(fm)) dayStartMinutes = fh*60 + fm;
      }
    }
    
    const relativeStartMinutes = agendamentoStartMin - dayStartMinutes;
    const topPx = (relativeStartMinutes / INTERVALO_MIN) * slotHeight;
    
    // Calcular altura baseada na duração
    const heightPx = (durMin / INTERVALO_MIN) * slotHeight;
    
    // Recalcular horário de término para display
    const endTotalMin = hRaw*60 + mRaw + durMin;
    const endHour = Math.floor(endTotalMin / 60);
    const endMin = endTotalMin % 60;
    const endStr = `${String(endHour).padStart(2,'0')}:${String(endMin).padStart(2,'0')}`;
    
    
    
    // Re-add cliente and servico before building dadosAg
    const cliente = ag.clienteNome || ag.usuario?.nome || 'Cliente';
    const servico = ag.servicoNome || ag.servico?.nome || 'Serviço';
    

    const dadosAg = {
      id: ag.id,
      dataHora: ag.dataHora || ag.data_hora || ag.data || null,
      usuario: ag.usuario || (ag.usuarioId ? { id: ag.usuarioId } : null),
      servico: ag.servico || (ag.servicoId ? { id: ag.servicoId } : null),
      clienteNome: cliente,
      servicoNome: servico,
      observacoes: ag.observacoes || ag.obs || null,
      status: ag.status || null
    };
    
    let encoded = '';
  try { encoded = encodeURIComponent(JSON.stringify(dadosAg)); } catch (error) { }
    
    const block = document.createElement('div');
    block.className = 'appointment-block unified absolute-block bg-pink-500 text-white rounded-md shadow-sm';
    block.dataset.agendamentoId = ag.id;
    block.setAttribute('data-agendamento', encoded);
    block.style.cssText = `position:absolute; top:${topPx}px; left:${contentLeft}px; width:${contentWidth}px; height:${heightPx}px; display:flex; flex-direction:column; justify-content:space-between; cursor:pointer; background:#ec4899; color:#fff; padding:4px 6px; box-sizing:border-box;`;
    block.innerHTML = `<div><div class=\"flex items-center text-sm mb-1\">\n<i class=\"fas fa-user-circle mr-2 text-white\"></i>\n<span class=\"font-bold\">${cliente}</span>\n</div><p class=\"text-xs mb-1 leading-snug\">${servico}</p></div><div class=\"text-[10px] opacity-90 tracking-wide flex justify-between\"><span>${horaInicioStr}</span><span>${endStr}</span></div>`;
    
    timeline.appendChild(block);
    // Calcular slots que devem ser marcados como ocupados
    const agendamentoStartMinutes = hRaw * 60 + mRaw;
    const agendamentoEndMinutes = agendamentoStartMinutes + durMin;
    // Encontrar todos os slots que se sobrepõem ao agendamento
    rows.forEach((row, index) => {
      const timeEl = row.querySelector('.agenda-time');
      if (!timeEl) return;
      
      const slotTimeStr = timeEl.textContent.trim();
      const [slotH, slotM] = slotTimeStr.split(':').map(n => parseInt(n, 10));
      const slotStartMinutes = slotH * 60 + slotM;
      const slotEndMinutes = slotStartMinutes + INTERVALO_MIN;
      
  // Verificar se este slot se sobrepõe ao agendamento
  const overlaps = (slotStartMinutes < agendamentoEndMinutes) && (slotEndMinutes > agendamentoStartMinutes);
  if (overlaps) {
        row.classList.add('slot-ocupado-parte');
        const cont = row.querySelector('.agenda-content');
        if (cont) {
          cont.classList.add('slot-ocupado-parte', 'ocupado');
        }
      }
    });
  });
}
// fim renderAgendamentosDia

function observeAgendaInsertion() {
  const container = document.getElementById('pages-container');
  if (!container) {
    return;
  }
  const observer = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.id === 'agenda') {
          configurarNavegacaoAgenda();
          atualizarAgendaDia();
        }
      });
    });
  });
  observer.observe(container, { childList: true });
  // Se já está presente e visível
  const existing = document.getElementById('agenda');
  if (existing) {
    if (!existing.classList.contains('hidden')) {
      configurarNavegacaoAgenda();
      atualizarAgendaDia();
    }
  }
  // Observar remoção de classe 'hidden' para quando a página for mostrada depois
  if (existing) {
    const attrObs = new MutationObserver(list => {
      list.forEach(mu => {
        if (mu.type === 'attributes' && mu.attributeName === 'class') {
          if (!existing.classList.contains('hidden')) {
            // Reinicializa se label vazio ou slots não gerados
            const label = document.getElementById('agenda-data-label');
            if (!label || !label.textContent || label.textContent === '—') {
              agendaDataAtual = new Date();
              configurarNavegacaoAgenda();
              atualizarAgendaDia();
            }
          }
        }
      });
    });
    attrObs.observe(existing, { attributes: true });
  }
}

function configurarNavegacaoAgenda() {
  if (window.__agendaNavWired) {
    return;
  }
  window.__agendaNavWired = true;
  const prevDia = document.getElementById('agenda-prev-dia');
  const nextDia = document.getElementById('agenda-next-dia');
  const hojeBtn = document.getElementById('agenda-hoje');
  const prevSemana = document.getElementById('agenda-prev-semana');
  const nextSemana = document.getElementById('agenda-next-semana');
  
  
  if (prevDia) prevDia.addEventListener('click', () => { agendaDataAtual.setDate(agendaDataAtual.getDate()-1); atualizarAgendaDia(); });
  if (nextDia) nextDia.addEventListener('click', () => { agendaDataAtual.setDate(agendaDataAtual.getDate()+1); atualizarAgendaDia(); });
  if (hojeBtn) hojeBtn.addEventListener('click', () => { agendaDataAtual = new Date(); atualizarAgendaDia(); });
  if (prevSemana) prevSemana.addEventListener('click', () => { agendaDataAtual.setDate(agendaDataAtual.getDate()-7); atualizarAgendaDia(); });
  if (nextSemana) nextSemana.addEventListener('click', () => { agendaDataAtual.setDate(agendaDataAtual.getDate()+7); atualizarAgendaDia(); });
  // Atualizações em tempo real
  window.addEventListener('agendamento:adicionado', (e) => {
    const ag = e.detail; if (!ag) return;
    const raw = ag.dataHora || ag.data_hora;
    let dataDoAg;
    if (Array.isArray(raw) && raw.length>=5) dataDoAg = new Date(raw[0], raw[1]-1, raw[2]);
    else if (typeof raw === 'string' && raw.includes('T')) { const dt = new Date(raw); if(!isNaN(dt)) dataDoAg = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
    if (dataDoAg && sameDay(dataDoAg, agendaDataAtual)) {
      renderAgendamentosDia([ag]);
      initAgendaTimeline();
    }
  });
  window.addEventListener('agendamento:atualizado', (e) => { if (e.detail) atualizarAgendaDia(); });
}

// ================= Funções utilitárias que estavam faltando =================
function dataISO(d) {
  if (!(d instanceof Date)) {
    return '';
  }
  const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return iso;
}

function formatarDataLabel(d) {
  try {
    const formatted = d.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'});
    return formatted;
  } catch (err) {
    return dataISO(d);
  }
}

function extrairHoraAgendamento(ag) {
  if (!ag) return null;
  let raw = ag.horaInicio || ag.hora || ag.inicio || ag.start || ag.horario || ag.hora_inicio;
  if (!raw) raw = ag.dataHora || ag.data_hora || ag.data;
  if (Array.isArray(raw)) {
    if (raw.length >= 5) {
      const h = String(raw[3]).padStart(2,'0');
      const m = String(raw[4]).padStart(2,'0');
      const result = `${h}:${m}`;
      return result;
    }
    return null;
  }
  if (typeof raw === 'number') {
    const h = Math.floor(raw/60); const m = raw % 60;
    const result = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    return result;
  }
  if (typeof raw !== 'string') return null;
  if (raw.includes('T')) {
    const dt = new Date(raw);
    if (!isNaN(dt)) {
      const result = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      return result;
    }
  }
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const result = `${String(parseInt(match[1],10)).padStart(2,'0')}:${match[2]}`;
    return result;
  }
  const hMatch = raw.match(/(\d{1,2})h(\d{2})?/i);
  if (hMatch) {
    const h = String(parseInt(hMatch[1],10)).padStart(2,'0');
    const m = hMatch[2] ? hMatch[2] : '00';
    const result = `${h}:${m}`;
    return result;
  }
  return null;
}

function parseDuracaoMinutos(ag) {
  if (!ag) return INTERVALO_MIN;
  let v = ag.duracaoMinutos || ag.duracao || ag.duracao_minutos || ag.duracao_em_minutos;
  if (v == null && ag.servico) {
    const s = ag.servico;
    v = s.duracaoMinutos || s.duracao || s.duracao_minutos || s.duracao_em_minutos || s.tempo || s.tempo_minutos || s.tempoEstimado || s.tempo_estimado || s.tempoEstimadoMinutos || s.tempo_atendimento;
  }
  if (v == null) {
    const horaInicio = extrairHoraAgendamento(ag);
    const horaFimRaw = ag.horaFim || ag.fim || ag.end || ag.hora_fim;
    if (horaInicio && horaFimRaw) {
      let horaFimStr = null;
      if (Array.isArray(horaFimRaw) && horaFimRaw.length >= 5) {
        horaFimStr = `${String(horaFimRaw[3]).padStart(2,'0')}:${String(horaFimRaw[4]).padStart(2,'0')}`;
      } else if (typeof horaFimRaw === 'string') {
        if (horaFimRaw.includes('T')) {
          const dt = new Date(horaFimRaw);
          if (!isNaN(dt)) horaFimStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
        } else {
          const m = horaFimRaw.match(/(\d{1,2}):(\d{2})/);
          if (m) horaFimStr = `${String(parseInt(m[1],10)).padStart(2,'0')}:${m[2]}`;
        }
      }
      if (horaFimStr) {
        const [hi, mi] = horaInicio.split(':').map(n=>parseInt(n,10));
        const [hf, mf] = horaFimStr.split(':').map(n=>parseInt(n,10));
        if (![hi,mi,hf,mf].some(isNaN)) {
          let diff = (hf*60 + mf) - (hi*60 + mi);
          if (diff < 0) diff += 24*60;
          if (diff > 0) {
            return diff;
          }
        }
      }
    }
    return INTERVALO_MIN;
  }
  if (typeof v === 'number' && !isNaN(v)) {
    return v;
  }
  if (Array.isArray(v)) {
    if (v.length >= 2) {
      const result = v[0]*60 + v[1];
      return result;
    }
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (/^\d+$/.test(trimmed)) {
      const result = parseInt(trimmed,10);
      return result;
    }
    const m = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const result = parseInt(m[1],10)*60 + parseInt(m[2],10);
      return result;
    }
    const hm = trimmed.match(/^(\d{1,2})h(?:(\d{1,2}))?/i);
    if (hm) {
      const h = parseInt(hm[1],10);
      const mm = hm[2] ? parseInt(hm[2],10) : 0;
      const result = h*60 + mm;
      return result;
    }
    const mins = trimmed.match(/^(\d{1,3})\s*(min|m|minuto|minutos)$/i);
    if (mins) {
      const result = parseInt(mins[1],10);
      return result;
    }
  }
  if (v == null && ag.servico && typeof ag.servico.duracaoMinutos === 'number' && !isNaN(ag.servico.duracaoMinutos) && ag.servico.duracaoMinutos > INTERVALO_MIN) {
    return ag.servico.duracaoMinutos;
  }
  return INTERVALO_MIN;
}

function gerarSlotsDia(hInicio, hFim) {
  const timeline = document.getElementById('agenda-timeline');
  if (!timeline) return;
  timeline.innerHTML = '';
  const totalMinInicio = hInicio*60;
  const totalMinFim = hFim*60;
  for (let t = totalMinInicio; t < totalMinFim; t += INTERVALO_MIN) {
    const h = Math.floor(t/60); const m = t % 60;
    const horaStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const row = document.createElement('div');
    row.className = 'agenda-row flex border-b last:border-b-0 relative';
    row.innerHTML = `<div class="agenda-time w-16 text-xs text-right pr-2 py-2 select-none">${horaStr}</div><div class="agenda-content flex-1 relative py-1" data-hora="${horaStr}"></div>`;
    timeline.appendChild(row);
  }
}

function abrirModalPreenchendoHorario(data, horaStr) {
  carregarModalAgendamento().then(modal => {
    if (!modal) {
      return;
    }
    try {
      resetarCamposModalAgendamento(modal);
      const inputData = modal.querySelector('[name="data"]');
      const inputHora = modal.querySelector('[name="hora"]');
      if (inputData) {
        inputData.value = dataISO(data);
      }
      if (inputHora) {
        inputHora.value = horaStr;
      }
      modal.classList.remove('hidden');
      modal.classList.remove('opacity-0');
    } catch (err) {
    }
  }).catch(err => {
  });
}

function initAgendaTimeline() {
  const timeline = document.getElementById('agenda-timeline');
  if (!timeline) {
    return;
  }
  timeline.querySelectorAll('.agenda-content').forEach((cont, i) => {
    if (!cont.querySelector('.slot-add-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-add-btn absolute right-1 top-1 text-xs px-1 rounded bg-blue-500 text-white opacity-0 hover:opacity-100 transition';
      btn.textContent = '+';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const horaStr = cont.dataset.hora;
        abrirModalPreenchendoHorario(new Date(agendaDataAtual), horaStr);
      });
      cont.appendChild(btn);
      cont.addEventListener('mouseenter', () => btn.style.opacity = '1');
      cont.addEventListener('mouseleave', () => btn.style.opacity = '0');
    }
  });
  timeline.addEventListener('click', e => {
    const bloco = e.target.closest('.appointment-block');
    if (bloco) {
      const encoded = bloco.getAttribute('data-agendamento');
      if (!encoded) {
        return;
      }
      try {
        const dados = JSON.parse(decodeURIComponent(encoded));
        const evt = new CustomEvent('agendamento:editar', { detail: dados });
        window.dispatchEvent(evt);
      } catch (error) {
      }
      return;
    }
    const content = e.target.closest('.agenda-content');
    if (content && !content.classList.contains('ocupado')) {
      const horaStr = content.dataset.hora;
      abrirModalPreenchendoHorario(new Date(agendaDataAtual), horaStr);
    }
  });
}

async function atualizarAgendaDia() {
  const label = document.getElementById('agenda-data-label');
  if (label) label.textContent = '…';
  const dataRef = new Date(agendaDataAtual);
  const timeline = document.getElementById('agenda-timeline');
  if (timeline) {
    timeline.innerHTML = '';
  }
  preencherMiniSemana(dataRef);
  const lista = await carregarAgendamentosDia(dataRef);
  let inicio = INICIO_DIA_PADRAO;
  let fim = FIM_DIA_PADRAO;
  lista.forEach(ag => {
    const hStr = extrairHoraAgendamento(ag);
    if (!hStr) return;
    const [hh, mm] = hStr.split(':').map(n => parseInt(n,10));
    if (!isNaN(hh)) {
      if (hh < inicio) inicio = Math.max(0, hh);
      const dur = parseDuracaoMinutos(ag) || INTERVALO_MIN;
      const endTotal = hh*60 + mm + dur;
      const endHour = Math.ceil(endTotal/60);
      if (endHour > fim) fim = Math.min(23, endHour + 1);
    }
  });
  gerarSlotsDia(inicio, fim);
  renderAgendamentosDia(lista);
  initAgendaTimeline();
  if (label) label.textContent = formatarDataLabel(dataRef);
}

// Inicialização automátia
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeAgendaInsertion);
} else {
  observeAgendaInsertion();
}