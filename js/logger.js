export const LOG = {
  debug: (...args) => { if (window.__DEBUG) console.debug(...args); },
  info: (...args) => { if (window.__DEBUG) console.info(...args); },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

window.LOG = window.LOG || LOG;
