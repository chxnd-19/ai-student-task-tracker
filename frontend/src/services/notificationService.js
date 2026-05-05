import api from './api';

const BASE = 'notifications';

export const fetchNotifications = async () => {
  try {
    const res = await api.get(BASE);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const markRead = async (id) => {
  try {
    const res = await api.patch(`${BASE}/${id}/read`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const markAllRead = async () => {
  try {
    const res = await api.patch(`${BASE}/read-all`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};
