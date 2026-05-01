import axios from 'axios';
import { getToken, removeToken } from './authService';

/**
 * Shared axios instance used by all task service calls.
 *
 * Base URL:
 *   - In development: empty string → Vite proxy forwards /api/* to localhost:5000
 *   - In production:  VITE_API_URL env var (e.g. https://your-backend.onrender.com)
 *     If VITE_API_URL is not set, falls back to same-origin (works when frontend
 *     and backend are served from the same domain).
 *
 * Features:
 *   - 10 s request timeout with a friendly error message
 *   - Automatic JWT injection via request interceptor
 *   - 401 response interceptor: removes token + redirects to /login?reason=…
 *     with two guards:
 *       1. Skip redirect if already on /login or /signup (loop prevention)
 *       2. Debounce: only one redirect per 2 s window (duplicate 401 guard)
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10_000,
});

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
