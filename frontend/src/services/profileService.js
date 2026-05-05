import api from './api';

const BASE = '/profile';

export const fetchProfile = async () => {
  try {
    const res = await api.get(BASE);
    return { data: res.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const updateProfile = async (payload) => {
  try {
    const res = await api.put(BASE, payload);
    return { data: res.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};
