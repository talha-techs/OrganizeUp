/**
 * Utility functions for deferred deep linking and post-auth redirection.
 * Handles safe redirection after login, registration, and Google OAuth.
 */

const STORAGE_KEY = 'organizeup_post_auth_redirect';

// Blocklist of authentication/system paths that should never be redirect targets
const DISALLOWED_PATHS = [
  '/login',
  '/signup',
  '/auth/google/success',
  '/auth/google',
];

/**
 * Validates if a redirect URL is safe to navigate to (prevents Open Redirect vulnerabilities).
 * Must be a relative path starting with '/', not '//', not containing backslashes or protocol.
 *
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export const isSafeRedirect = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Must begin with a single slash, not double slash (//evil.com) and not backslash (\evil.com)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return false;
  }

  // Reject javascript:, data:, http:, https: or backslash tricks anywhere in the URL
  if (
    /^(?:[a-z][a-z0-9+.-]*:|\/\/|\\\\)/i.test(trimmed) ||
    /(?:javascript|data):/i.test(trimmed) ||
    trimmed.includes('\\')
  ) {
    return false;
  }

  // Reject paths that point to auth loops
  const pathname = trimmed.split('?')[0].split('#')[0].toLowerCase();
  if (DISALLOWED_PATHS.some((disallowed) => pathname === disallowed || pathname.startsWith(`${disallowed}/`))) {
    return false;
  }

  return true;
};

/**
 * Returns a sanitized redirect path or the fallback (defaults to '/dashboard').
 *
 * @param {string|null|undefined} target
 * @param {string} fallback
 * @returns {string}
 */
export const getSafeRedirect = (target, fallback = '/dashboard') => {
  if (isSafeRedirect(target)) {
    return target.trim();
  }
  return fallback;
};

/**
 * Persists the target redirect in sessionStorage so it survives
 * third-party OAuth roundtrips (Google login) and page reloads.
 *
 * @param {string|null|undefined} target
 */
export const saveAuthRedirect = (target) => {
  try {
    if (typeof window === 'undefined') return;
    if (isSafeRedirect(target) && target !== '/dashboard') {
      window.sessionStorage.setItem(STORAGE_KEY, target.trim());
    }
  } catch (err) {
    console.warn('Failed to save auth redirect to sessionStorage:', err);
  }
};

/**
 * Retrieves the stored redirect target from sessionStorage.
 *
 * @returns {string|null}
 */
export const getStoredAuthRedirect = () => {
  try {
    if (typeof window === 'undefined') return null;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return isSafeRedirect(stored) ? stored : null;
  } catch (err) {
    console.warn('Failed to read auth redirect from sessionStorage:', err);
    return null;
  }
};

/**
 * Clears the stored redirect target from sessionStorage.
 */
export const clearAuthRedirect = () => {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear auth redirect from sessionStorage:', err);
  }
};

/**
 * Resolves the destination URL from all possible sources with precedence:
 * 1. URL query param `?redirect=`
 * 2. URL query param `?returnTo=`
 * 3. React Router location state `location.state.from`
 * 4. Browser sessionStorage
 * 5. Fallback (`/dashboard`)
 *
 * Also persists the resolved destination to sessionStorage if non-default.
 *
 * @param {object} options
 * @param {object} [options.location] React router location
 * @param {URLSearchParams} [options.searchParams] React router search params
 * @param {string} [options.fallback]
 * @returns {string}
 */
export const resolveAuthRedirect = ({ location, searchParams, fallback = '/dashboard' } = {}) => {
  let candidate = null;

  // 1. Check searchParams (?redirect=... or ?returnTo=...)
  if (searchParams) {
    const fromQuery = searchParams.get('redirect') || searchParams.get('returnTo');
    if (fromQuery) {
      candidate = fromQuery;
    }
  }

  // 2. Check location.search directly if searchParams wasn't passed
  if (!candidate && typeof window !== 'undefined' && window.location?.search) {
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromQuery = sp.get('redirect') || sp.get('returnTo');
      if (fromQuery) candidate = fromQuery;
    } catch {
      // ignore
    }
  }

  // 3. Check React Router location state
  if (!candidate && location?.state?.from) {
    const fromState = location.state.from;
    if (typeof fromState === 'string') {
      candidate = fromState;
    } else if (fromState.pathname) {
      candidate = fromState.pathname + (fromState.search || '') + (fromState.hash || '');
    }
  }

  // 4. Check sessionStorage
  if (!candidate) {
    candidate = getStoredAuthRedirect();
  }

  // Validate and sanitize
  const safeTarget = getSafeRedirect(candidate, fallback);

  // If a valid custom target was found, persist it for OAuth resilience
  if (safeTarget !== fallback) {
    saveAuthRedirect(safeTarget);
  }

  return safeTarget;
};

/**
 * Helper to display human-friendly context labels in Login/Signup banners.
 *
 * @param {string} path
 * @returns {string}
 */
export const getResourceLabel = (path) => {
  if (!path || typeof path !== 'string') return 'this shared resource';
  const clean = path.toLowerCase();

  if (clean.includes('/books/')) return 'this book';
  if (clean.includes('/courses/')) return 'this course';
  if (clean.includes('/workspaces/') || clean.includes('/sections/')) return 'this workspace';
  if (clean.includes('/youtube-playlists/')) return 'this video playlist';
  if (clean.includes('/invite/')) return 'this team workspace invitation';
  if (clean.includes('/tools/')) return 'this tool';
  if (clean.includes('/captures/')) return 'this capture note';

  return 'this shared resource';
};
