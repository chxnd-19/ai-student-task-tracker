import api from './api';

const BASE = 'classes';

/**
 * Create a new workspace (Teacher only)
 */
export const createClass = async (payload) => {
  try {
    const res = await api.post(BASE, payload);
    return { data: res.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

/**
 * Unified: Fetch workspaces for the current user (Teacher or Student)
 */
export const fetchWorkspaces = async () => {
  try {
    const res = await api.get(BASE);
    return { data: res.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

// Legacy helpers mapping to the unified fetch
export const fetchMyClasses = fetchWorkspaces;
export const fetchJoinedClasses = fetchWorkspaces;

/**
 * Join a workspace via 6-char code (Student only)
 */
export const joinClass = async (code) => {
  try {
    const res = await api.post(`${BASE}/join`, { code });
    return { data: res.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};

/**
 * Delete a workspace (Teacher only)
 */
export const deleteClass = async (id) => {
  try {
    const res = await api.delete(`${BASE}/${id}`);
    return { data: res.data };
  } catch (err) {
    console.error("API ERROR:", err.response?.data || err.message);
    throw err;
  }
};
