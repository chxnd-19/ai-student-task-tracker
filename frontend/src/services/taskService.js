import api from './api';

const BASE = 'tasks';

export const fetchTasks = async (params = {}, signal) => {
  try {
    const r = await api.get(BASE, { params, signal });
    // Standard response: { success: true, data: [...] }
    const data = r.data.data || [];
    return {
      data,
      page: r.data.pagination?.page || 1,
      totalPages: r.data.pagination?.totalPages || 1,
      total: r.data.pagination?.total || 0,
      limit: r.data.pagination?.limit || 20,
    };
  } catch (err) {
    if (err.name !== 'CanceledError') {
      console.error("API ERROR:", err.response?.data || err.message);
    }
    throw err;
  }
};

export const fetchTaskById = async (id) => {
  try {
    const res = await api.get(`${BASE}/${id}`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const createTask = async (payload) => {
  try {
    const res = await api.post(BASE, payload);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const updateTask = async (id, payload) => {
  try {
    const res = await api.put(`${BASE}/${id}`, payload);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const deleteTask = async (id) => {
  try {
    return await api.delete(`${BASE}/${id}`);
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchStudents = async (workspaceId) => {
  try {
    const r = await api.get(`${BASE}/students`, { params: workspaceId ? { workspaceId } : {} });
    const data = r.data.data || [];
    return { data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchStudentById = async (id) => {
  try {
    const res = await api.get(`${BASE}/students/${id}`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchTaskSummary = async (classId) => {
  try {
    const res = await api.get(`${BASE}/summary`, { params: classId ? { classId } : {} });
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};
