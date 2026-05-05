import api from './api';

const BASE = '/api/classes';

export const fetchMyClasses     = ()       => api.get(`${BASE}/my`);
export const fetchJoinedClasses = ()       => api.get(`${BASE}/joined`);
export const fetchAllClasses    = ()       => api.get(BASE);
export const createClass        = (data)   => api.post(BASE, data);
export const joinClass          = (code)   => api.post(`${BASE}/join`, { code });
export const deleteClass        = (id)     => api.delete(`${BASE}/${id}`);
