import api from './api';

const BASE = '/api/submissions';

export const submitTask = async (taskId, textSubmission, file) => {
  const form = new FormData();
  form.append('taskId', taskId);
  if (textSubmission) form.append('textSubmission', textSubmission);
  if (file)           form.append('file', file);
  const res = await api.post(BASE, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { data: res.data.data };
};

export const fetchSubmissionsForTask = async (taskId) => {
  const res = await api.get(`${BASE}/task/${taskId}`);
  return { data: res.data.data };
};

export const fetchMySubmissions = async () => {
  const res = await api.get(`${BASE}/my`);
  return { data: res.data.data };
};

export const fetchClassAnalytics = async (classId) => {
  const res = await api.get(`${BASE}/analytics/class/${classId}`);
  return { data: res.data.data };
};

export const fetchStudentAnalytics = async () => {
  const res = await api.get(`${BASE}/analytics/student`);
  return { data: res.data.data };
};

export const fetchReminders = async () => {
  const res = await api.get(`${BASE}/reminders`);
  return { data: res.data.data };
};

export const retryGrading = async (submissionId) => {
  const res = await api.post(`${BASE}/${submissionId}/retry-grading`);
  return { data: res.data.data };
};
