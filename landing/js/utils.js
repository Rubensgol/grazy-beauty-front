export function preloadImages() {
  window.addEventListener('load', () => {
    const importantImages = document.querySelectorAll('.hero-image img, .about-img');
    importantImages.forEach(img => {
      const preload = document.createElement('link');
      preload.rel = 'preload';
      preload.as = 'image';
      preload.href = img.src;
      document.head.appendChild(preload);
    });
  });
}

export function logConsoleMessage() {
  console.log('%c Grazy Beauty 💄', 'color: #b5879d; font-size: 24px; font-weight: bold;');
  console.log('%c Desenvolvido com ♥ ', 'color: #6b7280; font-size: 12px;');
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
