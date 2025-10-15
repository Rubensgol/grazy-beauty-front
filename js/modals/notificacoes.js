export function adicionarNotificacao(texto, tipo = 'info') {
  try {
    const id = 'app-toast';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.bottom = '16px';
      el.style.right = '16px';
      el.style.maxWidth = '360px';
      el.style.zIndex = '999999';
      document.body.appendChild(el);
    }
    const item = document.createElement('div');
    item.style.marginTop = '8px';
    item.style.padding = '10px 12px';
    item.style.borderRadius = '8px';
    item.style.background = tipo === 'success' ? '#e6ffed' : tipo === 'error' ? '#ffe6e6' : '#eef6ff';
    item.style.color = tipo === 'success' ? '#08660d' : tipo === 'error' ? '#8a0b0b' : '#08306b';
    item.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)';
    item.textContent = texto;
    el.appendChild(item);
    setTimeout(() => {
      item.style.transition = 'opacity .3s ease';
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 300);
    }, 2500);
  } catch {}
}
