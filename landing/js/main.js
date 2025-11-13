import { 
  initHeaderScroll, 
  initMobileMenu, 
  initSmoothScroll, 
  initScrollToTop 
} from './navigation.js';

import { 
  initContactForm, 
  initFormValidation 
} from './forms.js';

import { 
  initScrollAnimations, 
  initStatsCounter, 
  initLazyLoading 
} from './animations.js';

import { initPortfolio } from './portfolio.js';

import { initServicos } from './servicos.js';

import { initHero } from './hero.js';

import { initAbout } from './about.js';

import { 
  preloadImages, 
  logConsoleMessage 
} from './utils.js';


function init() {
  initHeaderScroll();
  initMobileMenu();
  initSmoothScroll();
  initScrollToTop();
  initContactForm();
  initFormValidation();
  
  initScrollAnimations();
  initStatsCounter();
  initLazyLoading();
  
  initHero();
  initAbout();
  initPortfolio();
  initServicos();
  
  preloadImages();
  logConsoleMessage();
}

window.addEventListener('sectionsLoaded', init);
