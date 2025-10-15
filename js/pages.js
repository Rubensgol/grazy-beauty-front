import { LOG } from './configuracao/logger.js';

class PageManager
{
    constructor() {
        this.pagesContainer = document.getElementById('pages-container');
        this.currentPage = null;
        this.loadedPages = new Map();
    }

    async loadPage(pageName) {
        if (this.loadedPages.has(pageName)) {
            const shown = this.showPage(pageName);
            window.dispatchEvent(new CustomEvent('page:shown', { detail: { page: pageName }}));
            return shown;
        }

        try {
            const response = await fetch(`pages/${pageName}.html?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Erro ao carregar página ${pageName}`);
            }
            const html = await response.text();
            this.loadedPages.set(pageName, html);
            LOG.debug('[pages] html content', html);
            this.pagesContainer.insertAdjacentHTML('beforeend', html);
            LOG.debug('[pages] after insert, #lista-clientes', document.querySelector('#lista-clientes'));
            const shown = this.showPage(pageName);
            window.dispatchEvent(new CustomEvent('page:loaded', { detail: { page: pageName }}));
            window.dispatchEvent(new CustomEvent('page:shown', { detail: { page: pageName }}));
            return shown;
        } catch (error) {
            console.error('Erro ao carregar página:', error);
        }
    }

    showPage(pageName) {
        // Esconder todas as páginas
        const allPages = this.pagesContainer.querySelectorAll('.page-content');
        allPages.forEach(page => page.classList.add('hidden'));

        // Mostrar página específica
        const targetPage = document.getElementById(pageName);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            this.currentPage = pageName;
        }
    }

    hideAllPages() {
        const allPages = this.pagesContainer.querySelectorAll('.page-content');
        allPages.forEach(page => page.classList.add('hidden'));
        this.currentPage = null;
    }
}

// Instância global do gerenciador de páginas
window.pageManager = new PageManager();
