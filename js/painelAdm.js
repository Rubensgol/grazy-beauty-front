import { LOG } from './logger.js';

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
    if (targetId === 'clientes') targetId = 'usuarios'; // alias legado
        
        setActiveLink(this);
        pageTitle.textContent = this.querySelector('span').textContent;
        
        if (window.pageManager) {
            const prev = targetId;
            window.pageManager.loadPage(targetId).then(() => {
                if (prev === 'usuarios') {
                    window.dispatchEvent(new CustomEvent('page:loaded', { detail: { page: 'usuarios' }}));
                    window.dispatchEvent(new CustomEvent('page:shown', { detail: { page: 'usuarios' }}));
                }
            });
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
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadModals();
    const modalScripts = [
        'js/modals/agendamento.js',
        'js/modals/servico.js',
        'js/modals/payment.js',
        'js/modals/day-details.js'
    ];

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Falha ao carregar ' + src));
            document.head.appendChild(s);
        });
    }

    for (const src of modalScripts) {
        try {
            await loadScript(src);
        } catch (err) {
            LOG.error(err);
        }
    }

    if (window.initAgendamentoModal) window.initAgendamentoModal();
    if (window.initServicoModal) window.initServicoModal();
    if (window.initPaymentModal) window.initPaymentModal();
    if (window.initDayDetailsModal) window.initDayDetailsModal();

    initApp();
    
    if (window.pageManager) {
        window.pageManager.loadPage('dashboard');
    }
});
