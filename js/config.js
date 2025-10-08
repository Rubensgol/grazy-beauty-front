export function getApiBase() {
  if (typeof window !== 'undefined' && window.__API_BASE) return window.__API_BASE;
  const meta = typeof document !== 'undefined' && document.querySelector('meta[name="api-base"]');
  if (meta && meta.content) return meta.content;
  return 'http://localhost:8080';
}

export function apiUrl(path) {
  const base = getApiBase().replace(/\/+$/, '');
  if (!path) return base;
  return base + (path.startsWith('/') ? path : '/' + path);
}

// Also expose globally for scripts that are not modules
if (typeof window !== 'undefined' && !window.apiUrl) {
  window.apiUrl = apiUrl;
}
