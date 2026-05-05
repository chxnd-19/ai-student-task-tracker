import api from './api';

const BASE_URL = '/api/auth';

export const signup = async (data) => {
  try {
    const res = await api.post(`${BASE_URL}/signup`, data);
    return res.data; // Returns { success, user, token }
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const login = async (data) => {
  try {
    const res = await api.post(`${BASE_URL}/login`, data);
    return res.data; // Returns { success, user, token }
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

// ── Auth helpers ────────────────────────────────────────────────────────────
export const saveAuthData = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const saveToken   = (token) => localStorage.setItem('token', token);
export const getToken    = ()      => localStorage.getItem('token');
export const getUser     = ()      => JSON.parse(localStorage.getItem('user'));
export const removeToken = ()      => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
