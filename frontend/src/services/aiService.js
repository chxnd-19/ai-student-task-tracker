/**
 * aiService — API calls for the AI Study Intelligence module.
 *
 * All functions accept an optional classId to scope results to a class.
 * Responses follow the standard envelope: { success, data }
 */
import api from './api';

const BASE = '/api/ai';

/**
 * getPriority — fetch tasks with AI priority scores, sorted highest first.
 * @param {string|null} classId
 * @returns {Promise<{ data: Array }>}
 */
export const getPriority = async (classId = null) => {
  const res = await api.get(`${BASE}/priority`, {
    params: classId ? { classId } : {},
  });
  return res.data;
};

/**
 * getPlan — fetch the AI-generated daily study plan.
 * @param {string|null} classId
 * @returns {Promise<{ data: Array<{ task_id, title, subject, ai_score, start, end }> }>}
 */
export const getPlan = async (classId = null) => {
  const res = await api.get(`${BASE}/plan`, {
    params: classId ? { classId } : {},
  });
  return res.data;
};

/**
 * getInsights — fetch AI study insights and warnings.
 * @param {string|null} classId
 * @returns {Promise<{ data: string[] }>}
 */
export const getInsights = async (classId = null) => {
  const res = await api.get(`${BASE}/insights`, {
    params: classId ? { classId } : {},
  });
  return res.data;
};
