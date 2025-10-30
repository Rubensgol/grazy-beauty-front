import { showNotification } from './notifications.js';


export function initContactForm() {
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
      const whatsappURL = `https://wa.me/5511999999999?text=${encodedMessage}`;
      
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

  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      if (input.hasAttribute('required') && !input.value.trim()) {
        input.style.borderColor = '#ef4444';
      } else {
        input.style.borderColor = '';
      }
    });
    
    input.addEventListener('focus', () => {
      input.style.borderColor = '';
    });
  });
}
