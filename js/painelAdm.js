import { LOG } from './configuracao/logger.js';
import { requireAuth, logout } from './configuracao/auth.js';
import { initTenantTheme, getCurrentConfig } from './configuracao/tenant-config.js';
import { fetchWithAuth } from './configuracao/http.js';

/**
 * Carrega o modal de logout
 */
async function loadLogoutModal() {
    try {
        const res = await fetch('modals/confirmar-logout.html');
        if (res.ok) {
            const html = await res.text();
            document.body.insertAdjacentHTML('beforeend', html);
        }
    } catch (err) {
        LOG.error('[painelAdm] Erro ao carregar modal de logout:', err);
    }
}

/**
 * Mostra o modal de confirmação de logout
 */
function showLogoutModal() {
    const modal = document.getElementById('modal-logout');
    if (!modal) return;
    
    modal.classList.remove('hidden', 'hiding');
    modal.classList.add('show');
    
    // Focar no botão cancelar
    setTimeout(() => {
        document.getElementById('btn-logout-cancel')?.focus();
    }, 100);
}

/**
 * Esconde o modal de logout
 */
function hideLogoutModal() {
    const modal = document.getElementById('modal-logout');
    if (!modal) return;
    
    modal.classList.remove('show');
    modal.classList.add('hiding');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('hiding');
    }, 150);
}

/**
 * Configura o botão de logout
 */
function setupLogoutButton() {
    const logoutBtn = document.getElementById('btn-logout');
    const mobileLogoutBtn = document.querySelector('#mobile-sidebar #btn-logout-mobile');
    
    const handleLogout = (e) => {
        e.preventDefault();
        showLogoutModal();
    };
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', handleLogout);
    }
    
    // Configurar botões do modal
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-logout-cancel' || e.target.closest('.modal-logout-overlay')) {
            hideLogoutModal();
        }
        
        if (e.target.id === 'btn-logout-confirm') {
            logout();
        }
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modal-logout');
            if (modal && modal.classList.contains('show')) {
                hideLogoutModal();
            }
        }
    });
}

async function loadModals() {
    const container = document.getElementById('modals-container');
    const modalFiles = [
        'modals/day-details.html'
    ];

    for (const path of modalFiles) {
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Falha ao carregar ${path}`);
            const html = await res.text();
            container.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            LOG.error(err);
        }
    }
}

/**
 * Aplica branding do tenant no painel
 */
async function applyPanelBranding(config) {
    LOG.debug('[painelAdm] Aplicando branding com config:', config);
    
    // Atualizar nome do negócio no sidebar e título da página
    const businessNameEls = document.querySelectorAll('.tenant-name');
    const businessName = config.businessName || config.nomeExibicao || config.nomeNegocio;
    businessNameEls.forEach(el => {
        if (businessName) {
            el.textContent = businessName;
        }
    });
    
    // Atualizar título da página (aba do navegador)
    if (businessName) {
        document.title = `${businessName} - Painel`;
    }
    
    // Atualizar logo se existir
    const logoUrl = config.logoUrl;
    LOG.debug('[painelAdm] Logo URL:', logoUrl);
    
    if (logoUrl && logoUrl.trim() !== '') {
        const logoContainers = document.querySelectorAll('.tenant-logo-container');
        logoContainers.forEach(container => {
            container.innerHTML = `<img src="${logoUrl}" alt="${businessName || 'Logo'}" class="h-8 w-8 object-contain">`;
        });
        LOG.debug('[painelAdm] Logo aplicada em', logoContainers.length, 'containers');
    } else {
        LOG.debug('[painelAdm] Nenhuma logo configurada, mantendo SVG padrão');
    }
    
    // Buscar nome do usuário logado para saudação
    try {
        const response = await fetchWithAuth('/api/users/me');
        if (response.ok) {
            const data = await response.json();
            const user = data.data || data;
            const userName = user.nome || user.name || '';
            const firstName = userName.split(' ')[0];
            
            const greetingEl = document.querySelector('.tenant-greeting');
            if (greetingEl && firstName) {
                greetingEl.textContent = `Olá, ${firstName}!`;
            }
            
            // Atualizar avatar se tiver foto
            const avatarEl = document.querySelector('.tenant-avatar');
            if (avatarEl && firstName) {
                avatarEl.src = `https://placehold.co/100x100/f3e8e8/333333?text=${firstName.charAt(0).toUpperCase()}`;
                avatarEl.alt = `Foto de ${firstName}`;
            }
        }
    } catch (err) {
        LOG.warn('[painelAdm] Erro ao buscar usuário logado:', err);
    }
    
    LOG.debug('[painelAdm] Branding do painel aplicado');
}

function initApp() {
    const sidebarNav = document.getElementById('sidebar-nav');
    const mobileSidebarNav = document.getElementById('mobile-sidebar');
    const pageContents = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('page-title');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');

    mobileSidebar.querySelector('nav').innerHTML = sidebarNav.innerHTML;
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    function setActiveLink(targetLink) {
         sidebarLinks.forEach(l => l.classList.remove('active', 'bg-gray-800', 'text-white'));
         
         const correspondingLinks = document.querySelectorAll(`.sidebar-link[href="${targetLink.getAttribute('href')}"]`);
         correspondingLinks.forEach(link => {
            link.classList.add('active', 'bg-gray-800', 'text-white');
            link.classList.remove('text-gray-600', 'hover:bg-gray-200');
         });


         sidebarLinks.forEach(link => {
            if(!link.classList.contains('active')) {
                link.classList.add('text-gray-600', 'hover:bg-gray-200');
            }
        });
    }

    function handleLinkClick(event) {
        event.preventDefault();
    let targetId = this.getAttribute('href').substring(1);
    if (targetId === 'clientes') targetId = 'clientes'; // alias legado
        
        setActiveLink(this);
        pageTitle.textContent = this.querySelector('span').textContent;
        
        // Salvar última página visitada no localStorage
        try {
            localStorage.setItem('lastVisitedPage', targetId);
            LOG.debug('[painelAdm] Página salva:', targetId);
        } catch (e) {
            LOG.warn('[painelAdm] Erro ao salvar página:', e);
        }
        
        if (window.pageManager) {
            window.pageManager.loadPage(targetId);
        }
        
        if(!mobileSidebar.classList.contains('-translate-x-full')) {
            toggleMobileMenu();
        }
    }

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', handleLinkClick);
    });
    
    const toggleMobileMenu = () => {
        mobileSidebar.classList.toggle('-translate-x-full');
        mobileSidebarOverlay.classList.toggle('hidden');
    };

    mobileMenuButton.addEventListener('click', toggleMobileMenu);
    mobileSidebarOverlay.addEventListener('click', toggleMobileMenu);
    
    // Configurar botão de logout
    setupLogoutButton();
}

document.addEventListener('DOMContentLoaded', async () => {
    // Validar token no servidor antes de continuar
    const isAuthenticated = await requireAuth({ validateRemote: true });
    if (!isAuthenticated) return;

    // Carregar modal de logout
    await loadLogoutModal();

    // Inicializar tema do tenant
    try {
        const tenantConfig = await initTenantTheme();
        applyPanelBranding(tenantConfig);
        LOG.info('[painelAdm] Tema do tenant aplicado');
    } catch (err) {
        LOG.warn('[painelAdm] Erro ao aplicar tema do tenant:', err);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Falha ao carregar ' + src));
            document.head.appendChild(s);
        });
    }

    if (window.initAgendamentoModal) window.initAgendamentoModal();
    if (window.initServicoModal) window.initServicoModal();
    if (window.initPaymentModal) window.initPaymentModal();
    if (window.initDayDetailsModal) window.initDayDetailsModal();

    initApp();
    
    // Restaurar última página visitada ou carregar dashboard por padrão
    let pageToLoad = 'dashboard';
    try {
        const lastPage = localStorage.getItem('lastVisitedPage');
        if (lastPage) {
            pageToLoad = lastPage;
            LOG.info('[painelAdm] Restaurando última página:', lastPage);
            
            // Ativar o link correspondente no menu
            const targetLink = document.querySelector(`.sidebar-link[href="#${lastPage}"]`);
            if (targetLink) {
                // Atualizar visual do menu
                document.querySelectorAll('.sidebar-link').forEach(l => {
                    l.classList.remove('active', 'bg-gray-800', 'text-white');
                    l.classList.add('text-gray-600', 'hover:bg-gray-200');
                });
                
                const correspondingLinks = document.querySelectorAll(`.sidebar-link[href="#${lastPage}"]`);
                correspondingLinks.forEach(link => {
                    link.classList.add('active', 'bg-gray-800', 'text-white');
                    link.classList.remove('text-gray-600', 'hover:bg-gray-200');
                });
                
                // Atualizar título da página
                const pageTitle = document.getElementById('page-title');
                if (pageTitle && targetLink.querySelector('span')) {
                    pageTitle.textContent = targetLink.querySelector('span').textContent;
                }
            }
        }
    } catch (e) {
        LOG.warn('[painelAdm] Erro ao restaurar página:', e);
    }
    
    if (window.pageManager) {
        window.pageManager.loadPage(pageToLoad);
    }
});
