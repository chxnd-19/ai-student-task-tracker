import axios from 'axios';

/**
 * Auth calls use a plain axios instance (no interceptor) to avoid
 * redirect loops when a 401 is returned on login/signup itself.
 *
 * Base URL follows the same rule as api.js:
 *   - Dev:  empty → Vite proxy handles /api/*
 *   - Prod: VITE_API_URL env var, or same-origin fallback
 */
const authAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10_000,
});

const BASE_URL = '/api/auth';

export const signup = (data) => authAxios.post(`${BASE_URL}/signup`, data);
export const login  = (data) => authAxios.post(`${BASE_URL}/login`,  data);

// ── Token helpers ────────────────────────────────────────────────────────────
export const saveToken   = (token) => localStorage.setItem('token', token);
export const getToken    = ()      => localStorage.getItem('token');
export const removeToken = ()      => localStorage.removeItem('token');
