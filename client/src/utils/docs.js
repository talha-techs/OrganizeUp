/**
 * Resolves the external documentation subdomain URL.
 * Automatically checks if the current hostname uses organizeup.com or organizeup.app,
 * or allows an environment override via VITE_DOCS_URL.
 *
 * @param {string} [topic] - Optional topic query param (e.g. 'telegram-bot')
 * @returns {string} The full docs URL
 */
export const getDocsUrl = (topic = '') => {
  if (import.meta.env.VITE_DOCS_URL) {
    const base = import.meta.env.VITE_DOCS_URL.replace(/\/$/, '');
    return topic ? `${base}?topic=${encodeURIComponent(topic)}` : base;
  }

  const isCom = typeof window !== 'undefined' && window.location.hostname.endsWith('organizeup.com');
  const base = isCom ? 'https://docs.organizeup.com' : 'https://docs.organizeup.app';
  return topic ? `${base}?topic=${encodeURIComponent(topic)}` : base;
};
