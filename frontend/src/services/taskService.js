import api from './api';

const BASE = '/api/tasks';

export const fetchTasks = async (params = {}, signal) => {
  const r = await api.get(BASE, { params, signal });
  const data = r.data.data || [];
  return {
    data,
    page:       r.data.pagination?.page       || 1,
    totalPages: r.data.pagination?.totalPages || 1,
    total:      r.data.pagination?.total      || 0,
    limit:      r.data.pagination?.limit      || 20,
  };
};

export const fetchTaskById = async (id) => {
  const res = await api.get(`${BASE}/${id}`);
  return { data: res.data.data };
};

export const createTask = async (payload) => {
  const res = await api.post(BASE, payload);
  return { data: res.data.data };
};

export const updateTask = async (id, payload) => {
  const res = await api.put(`${BASE}/${id}`, payload);
  return { data: res.data.data };
};

export const deleteTask = async (id) => {
  return api.delete(`${BASE}/${id}`);
};

export const fetchStudents = async (workspaceId) => {
  const r = await api.get(`${BASE}/students`, {
    params: workspaceId ? { workspaceId } : {},
  });
  return { data: r.data.data || [] };
};

export const fetchStudentById = async (id) => {
  const res = await api.get(`/api/profile/${id}`);
  return { data: res.data.data };
};

export const fetchTaskSummary = async (classId) => {
  const res = await api.get(`${BASE}/summary`, {
    params: classId ? { classId } : {},
  });
  return { data: res.data.data };
};
