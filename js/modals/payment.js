// Modal de Pagamento: carrega o HTML e conecta eventos (padronizado)
import { fetchWithAuth } from '../configuracao/http.js';
export async function carregarModalPayment() {
    try {
        if (window.__paymentModalInit || document.getElementById('payment-modal')) {
            return;
        }
        const resp = await fetch('modals/payment.html');
        const html = await resp.text();
        document.getElementById('modals-container').insertAdjacentHTML('beforeend', html);

        const paymentModal = document.getElementById('payment-modal');
            const closeBtn = document.getElementById('close-payment-modal-button');
            const cancelBtn = document.getElementById('cancel-payment-modal-button');

            function preencherDados(dados) {
                if (!paymentModal || !dados) return;
                const header = paymentModal.querySelector('h3 + p');
                const spans = paymentModal.querySelectorAll('form > div h3 span, form > div p span, form > div p.font-bold');
                // Ajustar especificamente usando seletores dedicados
                const clienteSpan = paymentModal.querySelector('[data-pagamento-cliente]');
                const servicoSpan = paymentModal.querySelector('[data-pagamento-servico]');
                const totalValorEl = paymentModal.querySelector('[data-pagamento-total]');
                if (clienteSpan) clienteSpan.textContent = dados.usuario?.nome || dados.clienteNome || 'Cliente';
                if (servicoSpan) servicoSpan.textContent = dados.servico?.nome || dados.servicoNome || 'Serviço';
                if (totalValorEl) totalValorEl.textContent = dados.servico?.preco || dados.servico?.valor || dados.preco || dados.valor || '—';
                paymentModal.dataset.agendamentoId = dados.id;
            }
            const open = (dados) => {
                if (!paymentModal) return;
                if (dados) preencherDados(dados);
                paymentModal.classList.remove('hidden');
                setTimeout(() => paymentModal.classList.remove('opacity-0'), 10);
            };
            const close = () => {
                if (!paymentModal) return;
                paymentModal.classList.add('opacity-0');
                setTimeout(() => paymentModal.classList.add('hidden'), 300);
            };

            // Listener para abrir com dados
            if (!window.__paymentOpenListener) {
                window.addEventListener('pagamento:abrir', (ev) => {
                    const dados = ev.detail;
                    open(dados);
                });
                window.__paymentOpenListener = true;
            }

            // Submissão (finalizar agendamento)
            const form = paymentModal.querySelector('form');
            if (form && !form.dataset.wired) {
                form.dataset.wired = 'true';
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const agId = paymentModal.dataset.agendamentoId;
                    if (!agId) { return; }
                    const valorPago = form.querySelector('#valor-pago')?.value || null;
                    const metodo = form.querySelector('input[name="payment-method"]:checked')?.nextElementSibling?.textContent?.trim() || null;
                    const btn = form.querySelector('button[type="submit"]');
                    try {
                        if (btn) { btn.disabled = true; btn.dataset.originalText = btn.textContent; btn.textContent = 'Finalizando...'; }
                        const res = await fetch(apiUrl(`/api/agendamentos/${agId}/finalizar`), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ valorPago: valorPago ? Number(valorPago) : null, metodoPagamento: metodo })
                        });
                        if (!res.ok) throw new Error('Falha ao finalizar');
                        let data; try { data = await res.json(); } catch { data = { id: agId, status: 'CONCLUIDO' }; }
                        if (data && data.data) data = data.data;
                        data.status = data.status || 'CONCLUIDO';
                        window.dispatchEvent(new CustomEvent('agendamento:atualizado', { detail: data }));
                        close();
                    } catch(err) {
                        // Erro ao finalizar agendamento
                    } finally {
                        if (btn && btn.dataset.originalText) { btn.textContent = btn.dataset.originalText; btn.disabled = false; }
                    }
                });
            }

            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);
            if (paymentModal) paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) close(); });
            window.__paymentModalInit = true;
    } catch (err) {
        // Erro ao carregar modal de pagamento
    }
}
// Carregamento agora sob demanda; chame carregarModalPayment() quando necessário.
