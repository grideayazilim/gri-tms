import { api } from './httpClient';

// --- PENDING USERS ---
export const getPendingUsers = async () => {
  const response = await api.get('/settings/pending-users');
  return response;
};

export const approvePendingUser = async (id) => {
  const response = await api.post(`/settings/pending-users/${id}/approve`);
  return response;
};

export const rejectPendingUser = async (id) => {
  const response = await api.delete(`/settings/pending-users/${id}/reject`);
  return response;
};

// --- SYSTEM SETTINGS ---
export const getSystemSettings = async () => {
  const response = await api.get('/settings/system');
  return response;
};

export const updateSystemSettings = async (data) => {
  const response = await api.put('/settings/system', data);
  return response;
};

