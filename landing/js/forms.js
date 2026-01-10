import { showNotification } from './notifications.js';
import { fetchWithAuth } from '../../js/configuracao/http.js';
import { formatPhone } from './utils.js';

// Carregar serviços no select
async function carregarServicosNoSelect() {
  const selectServico = document.getElementById('service');
  if (!selectServico) return;

  try {
    const res = await fetchWithAuth('/api/servicos');
    if (!res.ok) {
      console.warn('[forms] Erro ao buscar serviços:', res.status);
      return;
    }

    const json = await res.json();
    let lista = [];
    
    if (json && json.success && Array.isArray(json.data)) {
      lista = json.data;
    } else if (Array.isArray(json)) {
      lista = json;
    }

    // Filtrar apenas serviços ativos
    const servicosAtivos = lista.filter(servico => {
      const temNome = servico.nome || servico.nomeServico;
      const estaAtivo = servico.ativo !== false && servico.ativo !== 0;
      return temNome && estaAtivo;
    });

    // Limpar options existentes (exceto a primeira "Selecione um serviço")
    const primeiraOption = selectServico.querySelector('option[value=""]');
    selectServico.innerHTML = '';
    if (primeiraOption) {
      selectServico.appendChild(primeiraOption);
    }

    // Adicionar serviços do backend
    servicosAtivos.forEach(servico => {
      const option = document.createElement('option');
      option.value = servico.nome || servico.nomeServico;
      option.textContent = servico.nome || servico.nomeServico;
      selectServico.appendChild(option);
    });

    // Adicionar opção "Outros" no final
    const optionOutros = document.createElement('option');
    optionOutros.value = 'Outros';
    optionOutros.textContent = 'Outros';
    selectServico.appendChild(optionOutros);

    console.log('[forms] Serviços carregados no select:', servicosAtivos.length);
  } catch (err) {
    console.error('[forms] Erro ao carregar serviços:', err);
  }
}

export function initContactForm() {
  carregarServicosNoSelect();
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData);
      
      // Criar mensagem para WhatsApp
      const message = `
*Nova Mensagem do Site*

*Nome:* ${data.name}
*Telefone:* ${data.phone}
*E-mail:* ${data.email}
*Serviço:* ${data.service}

*Mensagem:*
${data.message}
      `.trim();
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappURL = `https://wa.me/5521976180101?text=${encodedMessage}`;
      
      // Abrir WhatsApp
      window.open(whatsappURL, '_blank');
      
      // Limpar formulário
      contactForm.reset();
      
      // Mostrar mensagem de sucesso
      showNotification('Mensagem enviada! Aguarde nosso contato.', 'success');
    });
  }
}

/**
 * Initialize form validation
 */
export function initFormValidation() {
  const inputs = document.querySelectorAll('.contact-form input, .contact-form textarea, .contact-form select');
  const phoneInput = document.getElementById('phone');

  // Adicionar máscara de telefone
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  }

  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      validateField(input);
    });
    
    input.addEventListener('focus', () => {
      input.style.borderColor = '';
    });
    
    input.addEventListener('input', () => {
      // Remove error state on input
      if (input.style.borderColor === 'rgb(239, 68, 68)') {
        input.style.borderColor = '';
      }
    });
  });
}

/**
 * Validate a single form field
 */
function validateField(input) {
  if (input.hasAttribute('required') && !input.value.trim()) {
    input.style.borderColor = '#ef4444';
    return false;
  }
  
  if (input.type === 'email' && input.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value)) {
      input.style.borderColor = '#ef4444';
      return false;
    }
  }
  
  if (input.type === 'tel' && input.value) {
    const phoneDigits = input.value.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      input.style.borderColor = '#ef4444';
      return false;
    }
  }
  
  input.style.borderColor = '#10b981';
  return true;
}
