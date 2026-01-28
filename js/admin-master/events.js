/**
 * Admin Master - Módulo de Eventos
 * Configuração de event listeners
 */

import { apiUrl } from '../configuracao/config.js';
import { 
  getSuperAdminToken, 
  setSuperAdminToken, 
  clearSuperAdminAuth 
} from '../configuracao/auth.js';
import { 
  createTenant, 
  toggleTenantStatus, 
  resetTenantPassword, 
  deleteTenant 
} from './api.js';
import { formatPhone, generatePassword } from './helpers.js';
import { showToast } from './toast.js';
import {
  elements,
  showLoginModal,
  hideLoginModal,
  hideNewTenantModal,
  hideTenantDetailsModal,
  renderTenantsTable,
  updateStats,
  openTenantDetails,
  setSubmitLoading
} from './ui.js';

/**
 * Login do Super Admin
 */
async function doSuperAdminLogin(usuario, senha) {
  try {
    // Usar endpoint específico do super admin/master
    let resp = await fetch(apiUrl('/api/auth/login/master'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });
    
    // Se não existir endpoint master, tentar o padrão
    if (resp.status === 404) {
      resp = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });
    }

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        throw new Error('Usuário ou senha incorretos');
      }
      throw new Error(`Erro ${resp.status}`);
    }
    
    const body = await resp.json();
    const token = body.token || body.data?.token;
    
    if (!token) {
      throw new Error('Token não retornado');
    }
    
    // Usar função centralizada do auth.js
    setSuperAdminToken(token);
    return true;
  } catch (err) {
    console.error('[super-admin] Erro no login:', err);
    throw err;
  }
}

/**
 * Configura todos os event listeners
 */
export function setupEventListeners(state, loadTenants) {
  // Search
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderTenantsTable(state, (id) => openTenantDetails(id, state));
    });
  }
  
  // New Tenant Modal
  if (elements.btnNewTenant) {
    elements.btnNewTenant.addEventListener('click', () => {
      if (elements.modalNewTenant) {
        elements.modalNewTenant.classList.remove('hidden');
      }
    });
  }
  
  document.querySelectorAll('.btn-new-tenant').forEach(btn => {
    btn.addEventListener('click', () => {
      if (elements.modalNewTenant) {
        elements.modalNewTenant.classList.remove('hidden');
      }
    });
  });
  
  // Close modals
  const modalBackdrop = document.getElementById('modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', hideNewTenantModal);
  }
  
  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', hideNewTenantModal);
  }
  
  const btnCancel = document.getElementById('btn-cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', hideNewTenantModal);
  }
  
  const modalDetailsBackdrop = document.getElementById('modal-details-backdrop');
  if (modalDetailsBackdrop) {
    modalDetailsBackdrop.addEventListener('click', hideTenantDetailsModal);
  }
  
  const modalDetailsClose = document.getElementById('modal-details-close');
  if (modalDetailsClose) {
    modalDetailsClose.addEventListener('click', hideTenantDetailsModal);
  }
  
  // Phone mask
  if (elements.formNewTenant) {
    const phoneInput = elements.formNewTenant.querySelector('[name="telefoneAdmin"]');
    if (phoneInput) {
      phoneInput.addEventListener('input', (e) => {
        e.target.value = formatPhone(e.target.value);
      });
    }
    
    // Subdomain validation
    const subdomainInput = elements.formNewTenant.querySelector('[name="subdominio"]');
    if (subdomainInput) {
      subdomainInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      });
    }
  }
  
  // Form submit
  if (elements.formNewTenant) {
    elements.formNewTenant.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      // Remover campos vazios opcionais
      if (!data.dominioCustomizado) delete data.dominioCustomizado;
      if (!data.telefoneAdmin) delete data.telefoneAdmin;
      
      // Remover checkbox do payload (não faz parte do DTO do backend)
      delete data.sendWelcomeEmail;
      
      setSubmitLoading(true);
      
      try {
        const result = await createTenant(data);
        
        if (result.success || result.data) {
          showToast('success', 'Tenant Criado!', `${data.nomeNegocio} foi provisionado com sucesso.`);
          hideNewTenantModal();
          elements.formNewTenant.reset();
          
          // Refresh data
          await loadTenants();
        } else {
          throw new Error(result.message || 'Erro ao criar tenant');
        }
      } catch (err) {
        showToast('error', 'Erro', err.message);
      } finally {
        setSubmitLoading(false);
      }
    });
  }
  
  // Tenant actions
  const btnToggleStatus = document.getElementById('btn-toggle-status');
  if (btnToggleStatus) {
    btnToggleStatus.addEventListener('click', async () => {
      if (!state.currentTenant) return;
      
      await toggleTenantStatus(state.currentTenant.id, state);
      showToast('success', 'Status Alterado', 'O status do tenant foi atualizado.');
      hideTenantDetailsModal();
      await loadTenants();
    });
  }
  
  const btnResetPassword = document.getElementById('btn-reset-password');
  if (btnResetPassword) {
    btnResetPassword.addEventListener('click', async () => {
      if (!state.currentTenant) return;
      
      if (!confirm('Deseja realmente resetar a senha deste tenant?')) return;
      
      const result = await resetTenantPassword(state.currentTenant.id);
      showToast('info', 'Senha Resetada', `Nova senha temporária: ${result.tempPassword || 'Enviada por email'}`);
    });
  }
  
  const btnDeleteTenant = document.getElementById('btn-delete-tenant');
  if (btnDeleteTenant) {
    btnDeleteTenant.addEventListener('click', async () => {
      if (!state.currentTenant) return;
      
      const nome = state.currentTenant.nomeNegocio || state.currentTenant.businessName;
      if (!confirm(`ATENÇÃO: Esta ação é irreversível!\n\nDeseja realmente excluir o tenant "${nome}"?\n\nTodos os dados serão perdidos.`)) return;
      
      await deleteTenant(state.currentTenant.id);
      state.tenants = state.tenants.filter(t => t.id !== state.currentTenant.id);
      showToast('success', 'Tenant Excluído', 'O tenant foi removido com sucesso.');
      hideTenantDetailsModal();
      renderTenantsTable(state, (id) => openTenantDetails(id, state));
      updateStats(state);
    });
  }
  
  // Gerar Pagamento
  const btnGeneratePayment = document.getElementById('btn-generate-payment');
  if (btnGeneratePayment) {
    btnGeneratePayment.addEventListener('click', async () => {
      if (!state.currentTenant) return;
      
      const tenant = state.currentTenant;
      const plano = tenant.plano || tenant.plan;
      
      if (plano === 'GRATUITO') {
        showToast('warning', 'Plano Gratuito', 'Tenants em plano gratuito não possuem cobrança.');
        return;
      }
      
      if (!confirm(`Deseja gerar uma cobrança para "${tenant.nomeNegocio || tenant.businessName}"?`)) return;
      
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/master/tenants/${tenant.id}/gerar-pagamento`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao gerar pagamento');
        }
        
        const result = await response.json();
        showToast('success', 'Pagamento Gerado!', `Link de pagamento criado e enviado para o tenant.`);
        
        // Atualizar dados do tenant
        await loadTenants();
        
      } catch (error) {
        console.error('Erro ao gerar pagamento:', error);
        showToast('error', 'Erro', error.message || 'Erro ao gerar pagamento. Tente novamente.');
      }
    });
  }
  
  // Logout - usa modal bonito de confirmação
  const btnLogout = document.getElementById('btn-logout');
  const btnLogoutMobile = document.getElementById('btn-logout-mobile');
  const modalLogoutAdmin = document.getElementById('modal-logout-admin');
  const btnLogoutCancel = document.getElementById('btn-logout-admin-cancel');
  const btnLogoutConfirm = document.getElementById('btn-logout-admin-confirm');
  
  function showLogoutModal() {
    if (modalLogoutAdmin) {
      modalLogoutAdmin.classList.remove('hidden', 'hiding');
      modalLogoutAdmin.classList.add('show');
    }
  }
  
  function hideLogoutModal() {
    if (modalLogoutAdmin) {
      modalLogoutAdmin.classList.remove('show');
      modalLogoutAdmin.classList.add('hiding');
      setTimeout(() => {
        modalLogoutAdmin.classList.add('hidden');
        modalLogoutAdmin.classList.remove('hiding');
      }, 150);
    }
  }
  
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      showLogoutModal();
    });
  }
  
  if (btnLogoutMobile) {
    btnLogoutMobile.addEventListener('click', (e) => {
      e.preventDefault();
      showLogoutModal();
    });
  }
  
  if (btnLogoutCancel) {
    btnLogoutCancel.addEventListener('click', hideLogoutModal);
  }
  
  if (btnLogoutConfirm) {
    btnLogoutConfirm.addEventListener('click', () => {
      clearSuperAdminAuth();
      hideLogoutModal();
      showLoginModal();
    });
  }
  
  // Fechar com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalLogoutAdmin && modalLogoutAdmin.classList.contains('show')) {
      hideLogoutModal();
    }
  });
  
  // Fechar ao clicar no overlay
  if (modalLogoutAdmin) {
    modalLogoutAdmin.querySelector('.modal-logout-overlay')?.addEventListener('click', hideLogoutModal);
  }
  
  // Login Form
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userInput = document.getElementById('login-user');
      const passInput = document.getElementById('login-password');
      const errorDiv = document.getElementById('login-error');
      const submitBtn = formLogin.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      try {
        if (errorDiv) errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';
        
        await doSuperAdminLogin(userInput.value, passInput.value);
        
        hideLoginModal();
        await loadTenants();
        showToast('success', 'Bem-vindo!', 'Login realizado com sucesso');
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = err.message || 'Erro ao fazer login';
          errorDiv.classList.remove('hidden');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}
