import { LOG } from './logger.js';

const runtimeBase = (typeof window !== 'undefined' && window.__API_BASE) ? window.__API_BASE : null;
const meta = (typeof document !== 'undefined') && document.querySelector('meta[name="api-base"]');
const metaBase = meta ? meta.getAttribute('content') : null;

const defaultBase = metaBase || runtimeBase || (typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:8080');

export const API_BASE = defaultBase;

// Helper para montar URLs (evita barras duplas)
export function apiUrl(path = '') {
  if (!path.startsWith('/')) path = '/' + path;
  const url = API_BASE.replace(/\/$/, '') + path;
  LOG.debug(`[apiUrl] URL construída: ${url}`);
  return url;
}
