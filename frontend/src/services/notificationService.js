import api from './api';

const BASE = '/api/notifications';

export const fetchNotifications = ()    => api.get(BASE);
export const markAllRead        = ()    => api.patch(`${BASE}/read-all`);
export const markRead           = (id)  => api.patch(`${BASE}/${id}/read`);
