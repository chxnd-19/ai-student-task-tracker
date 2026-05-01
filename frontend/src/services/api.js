import axios from 'axios';
import { getToken, removeToken } from './authService';

/**
 * 🛰️ API COMMUNICATION CONTRACT
 * ----------------------------
 * This instance enforces a strict same-origin relative routing policy:
 *
 * FLOW:  Frontend (baseURL: /api) → Nginx (location /api/) → FastAPI (prefix: /api)
 *
 * RULES:
 *  1. NEVER use hardcoded URLs (localhost:8000, etc.)
 *  2. NEVER include '/api' in service paths (it's handled by baseURL)
 *  3. ALWAYS use this instance for authenticated requests.
 *
 * 🚨 CRITICAL: Do not break this contract. It ensures the system works
 * identically in Local Docker and Production without config changes.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
});

// ── Development Guard — Catch duplicate prefixes ──────────────────────────────
if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    if (config.url?.startsWith('/api')) {
      console.warn(
        `[API CONTRACT VIOLATION] Endpoint '${config.url}' includes redundant '/api' prefix. ` +
        `This will result in '/api/api/...' which may fail. Remove '/api' from the service file.`
      );
    }
    return config;
  });
}

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Redirect debounce — prevents multiple simultaneous 401s all redirecting ──
let _redirecting = false;

// ── Response interceptor — handle auth errors ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network timeout
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(
        Object.assign(error, {
          response: {
            ...error.response,
            data: { success: false, message: 'Request timed out. Please check your connection.' },
          },
        })
      );
    }

    const status  = error.response?.status;
    const message = error.response?.data?.message || '';

    const isAuthError =
      status === 401 ||
      message.toLowerCase().includes('session expired') ||
      message.toLowerCase().includes('not authorized');

    if (isAuthError && !_redirecting) {
      const onAuthPage = ['/login/teacher', '/login/student', '/login', '/signup'].some((p) =>
        window.location.pathname.startsWith(p)
      );

      if (!onAuthPage) {
        _redirecting = true;
        removeToken();

        const rawReason = message.includes('expired')
          ? 'Session expired. Please log in again.'
          : 'Please log in to continue.';
        const safeReason = rawReason.replace(/<[^>]*>/g, '').slice(0, 120);

        // Redirect to student login by default; user can switch to teacher panel from there
        window.location.href = `/login/student?reason=${encodeURIComponent(safeReason)}`;

        setTimeout(() => { _redirecting = false; }, 2000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
