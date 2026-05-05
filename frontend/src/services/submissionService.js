import api from './api';

const BASE = 'submissions';

export const submitTask = async (taskId, textSubmission, file) => {
  try {
    const form = new FormData();
    form.append('taskId', taskId);
    if (textSubmission) form.append('textSubmission', textSubmission);
    if (file)           form.append('file', file);
    const res = await api.post(BASE, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchSubmissionsForTask = async (taskId) => {
  try {
    const res = await api.get(`${BASE}/task/${taskId}`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchMySubmissions = async () => {
  try {
    const res = await api.get(`${BASE}/my`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchClassAnalytics = async (classId) => {
  try {
    const res = await api.get(`${BASE}/analytics/class/${classId}`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchStudentAnalytics = async () => {
  try {
    const res = await api.get(`${BASE}/analytics/student`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

export const fetchReminders = async () => {
  try {
    const res = await api.get(`${BASE}/reminders`);
    return { data: res.data.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};
