import { fetchWithAuth } from '../configuracao/http.js';
import { adicionarNotificacao } from './notificacoes.js';



export function limparCamposModalAgendamento(modal) {
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
        '[name="status"]'
    ];
    campos.forEach(sel => {
        const el = modal.querySelector(sel);
        if (el) el.value = '';
    });
    const selects = modal.querySelectorAll('select');
    selects.forEach(s => { s.selectedIndex = 0; });
    const form = modal.querySelector('form');
    if (form && form.dataset) form.dataset.editingId = '';
}

async function carregarClientes() {
    try {
        const response = await fetchWithAuth('/api/cliente');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        const clientes = data.data || data;
        if (!Array.isArray(clientes)) {
            return;
        }
        
        const select = document.getElementById('agendamento-cliente');
        if (!select) {
            return;
        }
        
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome || cliente.name || `Cliente ${cliente.id}`;
            select.appendChild(option);
        });
        
    } catch (error) {
        adicionarNotificacao('Erro ao carregar clientes', 'error');
    }
}

async function carregarServicos() {
    try {
        const response = await fetchWithAuth('/api/servicos');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        const servicos = data.data || data;
        if (!Array.isArray(servicos)) {
            return;
        }
        
        const select = document.getElementById('agendamento-servico');
        if (!select) {
            return;
        }
        
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        servicos.forEach(servico => {
            const option = document.createElement('option');
            option.value = servico.id;
            option.textContent = servico.nome || servico.name || `Serviço ${servico.id}`;
            select.appendChild(option);
        });
        
    } catch (error) {
        adicionarNotificacao('Erro ao carregar serviços', 'error');
    }
}

function configurarEventosModal() {
    
    const modal = document.getElementById('agendamento-modal');
    if (!modal) {
        return;
    }
    
    const closeBtn = modal.querySelector('#close-agendamento-modal-button, .close-modal, [data-close-modal]');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('hidden');
            modal.classList.add('opacity-0');
            limparCamposModalAgendamento(modal);
        });
    }

    // Botão cancelar
    const cancelBtn = modal.querySelector('#agendamento-cancel-button');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('hidden');
            modal.classList.add('opacity-0');
            limparCamposModalAgendamento(modal);
        });
    }

    // Botão adicionar cliente
    const criarClienteBtn = modal.querySelector('#cria-cliente, .open-cliente-modal-button');
    if (criarClienteBtn) {
        criarClienteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                const { carregarEAbrirModalCliente } = await import('./cliente-modal.js');
                await carregarEAbrirModalCliente();
            } catch (err) {
                adicionarNotificacao('Erro ao abrir modal de cliente', 'error');
            }
        });
    }
    
    // Fechar ao clicar fora do modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            e.preventDefault();
            modal.classList.add('hidden');
            modal.classList.add('opacity-0');
            limparCamposModalAgendamento(modal);
        }
    });
    
    // Evento de submit do formulário
    const form = modal.querySelector('form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            try {
                await salvarAgendamento(form);
                modal.classList.add('hidden');
                modal.classList.add('opacity-0');
                limparCamposModalAgendamento(modal);
                adicionarNotificacao('Agendamento criado com sucesso', 'success');
                window.dispatchEvent(new CustomEvent('agendamento:adicionado'));
            } catch (error) {
                adicionarNotificacao('Erro ao salvar agendamento: ' + error.message, 'error');
            }
        });
    }
}

async function salvarAgendamento(form) {
    if (!form) throw new Error('Formulário não encontrado');
    
    const formData = new FormData(form);
    const clienteId = formData.get('cliente');
    const servicoId = formData.get('servico');
    const data = formData.get('data');
    const hora = formData.get('hora');
    const observacoes = formData.get('observacoes') || '';
    
    // Validações básicas
    if (!clienteId || clienteId === '' || clienteId === 'Buscar cliente existente...') {
        throw new Error('Por favor, selecione um cliente');
    }
    if (!servicoId || servicoId === '' || servicoId === 'Selecione um serviço') {
        throw new Error('Por favor, selecione um serviço');
    }
    if (!data) {
        throw new Error('Por favor, selecione uma data');
    }
    if (!hora) {
        throw new Error('Por favor, selecione uma hora');
    }
    
    const data_obj = {
        usuarioId: parseInt(clienteId),
        servicoId: parseInt(servicoId),
        dataHora: `${data}T${hora}:00`,
        obs: observacoes
    };
    
    const isEditing = form.dataset.editingId;
    const url = isEditing ? `/api/agendamentos/${isEditing}` : '/api/agendamentos';
    const method = isEditing ? 'PUT' : 'POST';
    
    const response = await fetchWithAuth(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data_obj)
    });
    
    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errBody}`);
    }
    
    const result = await response.json();
    return result;
}

async function preencherCamposEdicao(agendamento) {

}

window.__openAgendamentoModal = function() {
    const modal = document.getElementById('agendamento-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.remove('opacity-0');
    }
};


export async function carregarModalAgendamento(agendamento = null) {
    try {
        const response = await fetch('/modals/agendamento.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();        
        
        // Sempre remover e recriar o modal para garantir listeners funcionando
        let modal = document.getElementById('agendamento-modal');
        if (modal) {
            modal.remove();
        }

        // Inserir no DOM
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('agendamento-modal');
        
        if (!modal) {
            throw new Error('Modal element not found after insertion');
        }
        
        // Carregar listas de clientes e serviços
        await Promise.all([
            carregarClientes(),
            carregarServicos()
        ]);
        
        // Configurar eventos (sempre, não usar cached flag)
        configurarEventosModal();
      
        // Se for edição, preencher campos
        if (agendamento) {
            await preencherCamposEdicao(agendamento);
        }
        
        return modal;
    } catch (error) {
        adicionarNotificacao('Erro ao carregar modal de agendamento', 'error');
        throw error;
    }
}

// Listener global lazy: garante abertura mesmo sem carregar previamente
if (!window.__agendamentoOpenerAttached) {
    document.addEventListener('click', async (e) => {
        const trigger = e.target.closest && e.target.closest('[data-open-agendamento-modal], #open-agendamento-modal-button, .open-agendamento-modal-button');
        if (!trigger) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        try {
            await carregarModalAgendamento();
            // Abrir em modo criação
            window.__agendamentoOpeningForEdit = false;
            if (window.__openAgendamentoModal) {
                window.__openAgendamentoModal();
            }
        } catch (err) {
            adicionarNotificacao('Erro ao abrir modal de agendamento', 'error');
        }
    });
    window.__agendamentoOpenerAttached = true;
}

// Listener para recarregar clientes quando um novo é adicionado
if (!window.__agendamentoClienteAddedListener) {
    window.addEventListener('cliente:adicionado', async () => {
        const modal = document.getElementById('agendamento-modal');
        if (modal) {
            await carregarClientes();
        }
    });
    window.__agendamentoClienteAddedListener = true;
}

// Listener para preencher ao editar agendamento (eventual integração futura)
if (!window.__agendamentoEditListener) {
    window.addEventListener('agendamento:editar', async (ev) => {
        let a = ev.detail; if (!a) return;
        // Se modal não existe ainda, carrega primeiro
        if (!document.getElementById('agendamento-modal')) {
            try { await carregarModalAgendamento(); } catch(e){ return; }
        }
        // Guardar IDs para aplicar após carregamento das listas
        if (a?.usuario?.id) window.__pendingAgendamentoClienteId = a.usuario.id;
        if (a?.servico?.id) window.__pendingAgendamentoServicoId = a.servico.id;
        window.__agendamentoOpeningForEdit = true;
        if (window.__openAgendamentoModal) {
            window.__openAgendamentoModal();
        } else {
        }

        // Se veio só id, tentar buscar detalhes
        if (a && a.id && (!a.dataHora && !a.data_hora)) {
            try {
                const res = await fetchWithAuth(`/api/agendamentos/${a.id}`);
                if (res.ok) {
                    let full = await res.json();
                    if (full && full.data) full = full.data;
                    a = { ...full, id: a.id };
                }
            } catch(err) { }
        }

        // Aguardar pequenos ms para selects carregarem
    setTimeout(() => {
            const modal = document.getElementById('agendamento-modal');
            if (!modal) return;
            const clienteSel = modal.querySelector('#agendamento-cliente');
            const servicoSel = modal.querySelector('#agendamento-servico');
            const dataInput = modal.querySelector('#agendamento-data');
            const horaInput = modal.querySelector('#agendamento-hora');
            const obsInput = modal.querySelector('#agendamento-observacoes');
            const form = modal.querySelector('form');
            // Caso listas já tenham carregado, aplica seleção imediata
            if (clienteSel && a?.usuario?.id) clienteSel.value = a.usuario.id;
            if (servicoSel && a?.servico?.id) servicoSel.value = a.servico.id;
            const dh = a?.dataHora || a?.data_hora;
            if (Array.isArray(dh) && dh.length >=5) {
                const [Y,M,D,H,Min] = dh;
                if (dataInput) dataInput.value = `${Y}-${String(M).padStart(2,'0')}-${String(D).padStart(2,'0')}`;
                if (horaInput) horaInput.value = `${String(H).padStart(2,'0')}:${String((Min||0)).padStart(2,'0')}`;
            } else if (typeof dh === 'string' && dh.includes('T')) {
                const dObj = new Date(dh);
                if (!isNaN(dObj.getTime())) {
                    if (dataInput) dataInput.value = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
                    if (horaInput) horaInput.value = `${String(dObj.getHours()).padStart(2,'0')}:${String(dObj.getMinutes()).padStart(2,'0')}`;
                }
            }
            if (obsInput) obsInput.value = a?.obs || a?.observacoes || '';
            if (form && a?.id) form.dataset.editingId = a.id;
            window.__agendamentoOpeningForEdit = false;
        }, 120);
    });
    window.__agendamentoEditListener = true;
}

// Restaura foco ao fechar modal de cliente sem criar
if (!window.__agendamentoFocusRestoreListener) {
    window.addEventListener('cliente:modal-fechado', () => {
        const agModal = document.getElementById('agendamento-modal');
        if (agModal) agModal.classList.remove('pointer-events-none');
        if (window.__agendamentoPrevFocus && document.contains(window.__agendamentoPrevFocus)) {
            try { window.__agendamentoPrevFocus.focus(); } catch {}
        } else {
            // fallback: foco no cliente ou serviço
            const cli = document.getElementById('agendamento-cliente');
            if (cli) cli.focus();
        }
        window.__agendamentoPrevFocus = null;
    });
    window.__agendamentoFocusRestoreListener = true;
}
