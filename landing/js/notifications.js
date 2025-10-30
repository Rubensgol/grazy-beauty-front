export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icon = getNotificationIcon(type);
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      ${icon}
      <div>
        <h4>${getNotificationTitle(type)}</h4>
        <p>${message}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Show animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
  const icons = {
    success: `
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #10b981;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
    `,
    error: `
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #ef4444;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    `,
    info: `
      <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #3b82f6;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `
  };
  
  return icons[type] || icons.info;
}

/**
 * Get notification title based on type
 */
function getNotificationTitle(type) {
  const titles = {
    success: 'Sucesso',
    error: 'Erro',
    info: 'Informação'
  };
  
  return titles[type] || titles.info;
}
