/**
 * Central API client — all HTTP calls should go through this instance (no hardcoded API hosts elsewhere).
 *
 * - Production base: `import.meta.env.VITE_API_URL` or `VITE_API_BASE_URL`, else Render fallback.
 * - Vite strips loopback values from those env vars on `vite build` (see vite.config.ts).
 * - `resolveRuntimeBaseURL()` forces HTTPS Render when the app is not opened on localhost.
 * - Cookies: `withCredentials: true` and HttpOnly auth cookie.
 */

import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  clearLegacyAuthStorage,
  clearCsrfSession,
  CSRF_STORAGE_KEY,
} from '@/utils/authStorage';

/** Hosted API used when a production build still points at localhost (common if VITE_API_URL was wrong on Vercel). */
const PRODUCTION_API_FALLBACK = 'https://saas-backend-oddg.onrender.com/api';

const LOOPBACK_IN_API = /localhost|127\.0\.0\.1|0\.0\.0\.0/i;

const fromEnv = `${import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || ''}`.trim();
const isBrowserOnLocalhost = () => {
  if (typeof window === 'undefined') return true;
  const h = String(window.location.hostname || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
};

// Production builds have no Vite proxy: default to hosted API (not /api — Vercel external rewrites often 404 OPTIONS preflight).
const rawBase = fromEnv || (import.meta.env.DEV ? '/api' : '');

// In Vite dev, requests must go through the dev server (/api proxy) so they share the page origin
// (cookies, CSRF). A direct http://localhost:5000 URL bypasses the proxy if the backend is down.
let API_BASE_URL =
  import.meta.env.DEV &&
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/api\/?$/i.test(rawBase)
    ? '/api'
    : rawBase || (import.meta.env.DEV ? '/api' : PRODUCTION_API_FALLBACK);

if (
  import.meta.env.PROD &&
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(API_BASE_URL)
) {
  console.warn(
    '[config] Production build was using a localhost API URL (check VITE_API_URL on Vercel). Using deployed API:',
    PRODUCTION_API_FALLBACK
  );
  API_BASE_URL = PRODUCTION_API_FALLBACK;
}

// Never call laptop localhost from a real deployed origin (bad VITE_* on Vercel, non-prod mode build, etc.).
if (
  typeof window !== 'undefined' &&
  !isBrowserOnLocalhost() &&
  /localhost|127\.0\.0\.1/i.test(API_BASE_URL)
) {
  console.warn(
    '[config] Blocking localhost API URL on a deployed site. Remove bad VITE_API_URL in Vercel env and redeploy.'
  );
  API_BASE_URL = PRODUCTION_API_FALLBACK;
}

/**
 * Effective base URL per request.
 *
 * CORS errors like "blocked from https://….vercel.app to http://localhost:5000" mean the *client*
 * is using a loopback URL on the public internet — localhost is each user's own PC, not Render.
 * Fix: never return loopback unless the page itself is on localhost (see guard below).
 */
function resolveRuntimeBaseURL() {
  const loc = typeof globalThis !== 'undefined' ? globalThis.location : null;
  const host = loc?.hostname ? String(loc.hostname).toLowerCase() : '';
  const onLocalPage =
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

  const bundled = String(API_BASE_URL || '').trim();

  // Must run before DEV||onLocalPage: a mis-built bundle can have DEV=true on Vercel + localhost in env.
  if (!onLocalPage && LOOPBACK_IN_API.test(bundled)) {
    console.warn(
      '[API] Refusing loopback API URL on a public origin (CORS would fail). Using:',
      PRODUCTION_API_FALLBACK
    );
    return PRODUCTION_API_FALLBACK;
  }

  if (import.meta.env.DEV || onLocalPage) {
    return bundled || '/api';
  }

  if (bundled.startsWith('https://') && !LOOPBACK_IN_API.test(bundled)) {
    return bundled.replace(/\/+$/, '');
  }

  return PRODUCTION_API_FALLBACK;
}

const api = axios.create({
  // Never trust raw API_BASE_URL here — axios uses this before interceptors; wrong bake = localhost on Vercel.
  baseURL: resolveRuntimeBaseURL(),
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

function buildNetworkErrorMessage() {
  const base = resolveRuntimeBaseURL();
  const isDevProxy = import.meta.env.DEV && base.startsWith('/');
  const pointsToLocalMachine =
    isDevProxy || /localhost|127\.0\.0\.1/i.test(base);

  if (isDevProxy) {
    return `Cannot reach the API (requests go to ${base} via the dev server → localhost:5000). Start the backend: cd saas-backend && npm run dev — and keep the frontend on npm run dev (not an old production build).`;
  }
  if (import.meta.env.PROD && base === '/api') {
    return 'Cannot reach the API: production build is still using /api. Set VITE_API_URL to your hosted API (e.g. https://….onrender.com/api) and redeploy.';
  }
  if (pointsToLocalMachine) {
    return `Cannot reach the API at ${base}. The server on your machine is not running or refused the connection. Start it (saas-backend: npm run dev), or point VITE_API_URL in saas/.env to your hosted API and run npm run build again.`;
  }
  if (import.meta.env.PROD) {
    console.warn(
      '[API] Network error — common causes: (1) Render cold start: wait ~1 min, retry. (2) CORS: use production URL saas-alpha-gold.vercel.app, or on Render set FRONTEND_URL to your exact site origin, or CORS_ALLOW_VERCEL_PREVIEW=true for preview deploys. (3) DevTools → Network: inspect the red request.'
    );
  }
  return `Cannot reach the API at ${base}. If it persists, wait a minute (Render may be starting), confirm your site URL is allowed by the API CORS settings, or check the browser Network tab.`;
}

const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const entry of cookies) {
    const [key, ...parts] = entry.split('=');
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(parts.join('='));
    }
  }

  return null;
};

/** Cross-origin API: csrf cookie is on the API host and is not visible to JS on localhost; use sessionStorage. */
const getCsrfHeaderValue = () => {
  if (typeof window === 'undefined') return null;
  try {
    const fromSession = window.sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  return getCookieValue('csrf_token');
};

api.interceptors.request.use(
  (config) => {
    const loc = typeof globalThis !== 'undefined' ? globalThis.location : null;
    const host = loc?.hostname ? String(loc.hostname).toLowerCase() : '';
    const onLocalPage =
      host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

    // Absolute URLs ignore baseURL — strip loopback hosts when not on a local dev machine.
    if (
      typeof config.url === 'string' &&
      /^https?:\/\//i.test(config.url) &&
      LOOPBACK_IN_API.test(config.url) &&
      !onLocalPage
    ) {
      try {
        const u = new URL(config.url);
        config.url = u.pathname.replace(/\/+$/, '') + (u.search || '');
        console.warn('[API] Rewrote loopback absolute URL to path:', config.url);
      } catch {
        /* leave url; baseURL below still points at production */
      }
    }

    config.baseURL = resolveRuntimeBaseURL();

    clearLegacyAuthStorage();

    delete config.headers.Authorization;
    delete config.headers.authorization;
    delete config.headers['X-Active-Role'];

    const csrfToken = getCsrfHeaderValue();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const isNetworkError = !error.response;
    const message = isNetworkError ? buildNetworkErrorMessage() : null;
    const finalMessage =
      message ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Request failed';
    toast.error(finalMessage);

    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      clearLegacyAuthStorage();
      clearCsrfSession();
      window.location.href = '/login';
    }

    return Promise.reject(new Error(finalMessage));
  }
);

/** Use for absolute URLs (e.g. uploads); same resolution as axios baseURL. */
export function getApiBaseURL() {
  return resolveRuntimeBaseURL();
}

export default api;
