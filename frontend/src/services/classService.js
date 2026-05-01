import api from './api';

const BASE = '/api/classes';

export const createClass      = (payload)  => api.post(BASE, payload).then((r) => ({ data: r.data.data }));
export const fetchMyClasses   = ()         => api.get(`${BASE}/my`).then((r) => ({ data: r.data.data }));
export const fetchJoinedClasses = ()       => api.get(`${BASE}/joined`).then((r) => ({ data: r.data.data }));
export const joinClass        = (joinCode) => api.post(`${BASE}/join`, { joinCode }).then((r) => ({ data: r.data.data }));
export const deleteClass      = (id)       => api.delete(`${BASE}/${id}`);
