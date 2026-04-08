const LEGACY_AUTH_KEYS = ['token', 'authToken', 'jwt', 'jwtToken', 'accessToken'];

/** Mirrors backend CSRF cookie name; used when API is on another origin (sessionStorage). */
export const CSRF_STORAGE_KEY = 'csrf_token';

export const clearLegacyAuthStorage = () => {
  if (typeof window === 'undefined') return;

  for (const key of LEGACY_AUTH_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

export const clearCsrfSession = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export const getLegacyAuthKeys = () => [...LEGACY_AUTH_KEYS];
