import api from './api';
const BASE = '/profile';
export const fetchProfile   = () => api.get(BASE).then((r) => ({ data: r.data.data }));
export const updateProfile  = (payload) => api.put(BASE, payload).then((r) => ({ data: r.data.data }));
