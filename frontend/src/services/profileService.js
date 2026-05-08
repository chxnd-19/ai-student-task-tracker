import api from './api';

/**
 * Fetch the current user's structured profile and role.
 * Returns: { success: true, data: { role, profile: { ... } } }
 */
export const getProfile = async () => {
  const response = await api.get('/api/profile');
  return response.data;
};

/**
 * Update the user's profile with partial fields.
 * Payload: { college_name, usn, full_name, ... }
 * Returns: { success: true, data: { role, profile: { ... } } }
 */
export const updateProfile = async (payload) => {
  const response = await api.put('/api/profile', payload);
  return response.data;
};
