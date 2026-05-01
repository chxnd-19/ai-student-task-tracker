import api from './api';
const BASE = '/api/notifications';
export const fetchNotifications = () => api.get(BASE).then((r) => ({ data: r.data.data }));
export const markRead           = (id) => api.patch(`${BASE}/${id}/read`).then((r) => ({ data: r.data.data }));
export const markAllRead        = () => api.patch(`${BASE}/read-all`).then((r) => ({ data: r.data.data }));
