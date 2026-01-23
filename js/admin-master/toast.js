/**
 * Admin Master - Sistema de Toast/Notificações
 */

/**
 * Mostrar toast notification
 */
export function showToast(type, title, message) {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastIcon || !toastTitle || !toastMessage) {
    console.warn('[toast] Elementos do toast não encontrados');
    return;
  }
  
  const icons = {
    success: `<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>`,
    error: `<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>`,
    info: `<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`,
    warning: `<svg class="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>`
  };
  
  const bgColors = {
    success: 'bg-green-100',
    error: 'bg-red-100',
    info: 'bg-blue-100',
    warning: 'bg-yellow-100'
  };
  
  toastIcon.className = `w-10 h-10 rounded-full flex items-center justify-center ${bgColors[type] || bgColors.info}`;
  toastIcon.innerHTML = icons[type] || icons.info;
  toastTitle.textContent = title;
  toastMessage.textContent = message;
  
  toast.classList.remove('translate-y-20', 'opacity-0');
  
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 4000);
}

/**
 * Esconder toast manualmente
 */
export function hideToast() {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.classList.add('translate-y-20', 'opacity-0');
  }
}
