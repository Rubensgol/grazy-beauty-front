export function preloadImages() {
  // Preload critical images on load
  window.addEventListener('load', () => {
    const criticalImages = document.querySelectorAll('.hero-image img');
    criticalImages.forEach(img => {
      if (img.src && !img.complete) {
        const preload = document.createElement('link');
        preload.rel = 'preload';
        preload.as = 'image';
        preload.href = img.src;
        document.head.appendChild(preload);
      }
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

export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
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

export function formatPhone(value) {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Formata como (XX) XXXXX-XXXX
  if (numbers.length <= 2) {
    return `(${numbers}`;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}
