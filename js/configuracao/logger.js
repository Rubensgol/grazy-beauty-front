// Habilita debug automaticamente em ambiente local ou quando ?debug=1
try {
  if (typeof window !== 'undefined') {
    const url = window.location && window.location.href || '';
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const params = (new URL(url)).searchParams;
    window.__DEBUG = window.__DEBUG || isLocal || params.get('debug') === '1';
  }
} catch (e) {
  // não falha se ambiente não tiver window
}

export const LOG = {
  debug: (...args) => { if (typeof window !== 'undefined' && window.__DEBUG) console.debug(...args); },
  info: (...args) => { if (typeof window !== 'undefined' && window.__DEBUG) console.info(...args); },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

if (typeof window !== 'undefined') window.LOG = window.LOG || LOG;
