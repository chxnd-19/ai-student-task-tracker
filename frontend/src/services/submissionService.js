import api from './api';

const BASE = '/api/submissions';

/**
 * submitTask — student submits text or PDF file.
 * Uses FormData so multer can parse the file on the backend.
 */
export const submitTask = (taskId, textSubmission, file) => {
  const form = new FormData();
  form.append('taskId', taskId);
  if (textSubmission) form.append('textSubmission', textSubmission);
  if (file)           form.append('file', file);
  return api.post(BASE, form, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((r) => ({ data: r.data.data }));
};

// Teacher: all submissions for a task
export const fetchSubmissionsForTask = (taskId) =>
  api.get(`${BASE}/task/${taskId}`).then((r) => ({ data: r.data.data }));

// Student: own submissions
export const fetchMySubmissions = () =>
  api.get(`${BASE}/my`).then((r) => ({ data: r.data.data }));

// Teacher: analytics for a class
export const fetchClassAnalytics = (classId) =>
  api.get(`${BASE}/analytics/class/${classId}`).then((r) => ({ data: r.data.data }));

// Student: own analytics summary
export const fetchStudentAnalytics = () =>
  api.get(`${BASE}/analytics/student`).then((r) => ({ data: r.data.data }));

// Student: smart deadline reminders
export const fetchReminders = () =>
  api.get(`${BASE}/reminders`).then((r) => ({ data: r.data.data }));
