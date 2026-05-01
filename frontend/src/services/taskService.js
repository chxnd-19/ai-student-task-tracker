import api from './api';

const BASE = '/tasks';

export const fetchTasks    = (params = {}, signal) =>
  api.get(BASE, { params, signal }).then((r) => ({
    data: r.data.data, page: r.data.meta?.page, totalPages: r.data.meta?.totalPages,
    total: r.data.meta?.total, limit: r.data.meta?.limit,
  }));
export const fetchTaskById = (id)       => api.get(`${BASE}/${id}`).then((r) => ({ data: r.data.data }));
export const createTask    = (payload)  => api.post(BASE, payload).then((r) => ({ data: r.data.data }));
export const updateTask    = (id, payload) => api.put(`${BASE}/${id}`, payload).then((r) => ({ data: r.data.data }));
export const deleteTask    = (id)       => api.delete(`${BASE}/${id}`);

// Teacher: fetch all students for assignment dropdown
export const fetchStudents = () => api.get(`${BASE}/students`).then((r) => ({ data: r.data.data }));

// Teacher: fetch a single student's profile + stats
export const fetchStudentById = (id) => api.get(`${BASE}/students/${id}`).then((r) => ({ data: r.data.data }));

// Student: fetch task status summary { pending, submitted, overdue, late }
// Pass classId to scope counts to the active class (avoids stale global counts)
export const fetchTaskSummary = (classId) =>
  api.get(`${BASE}/summary`, { params: classId ? { classId } : {} })
     .then((r) => ({ data: r.data.data }));
