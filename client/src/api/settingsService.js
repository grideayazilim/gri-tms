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

// --- MARKERS ---
export const getMarkers = async () => {
  const response = await api.get('/settings/markers');
  return response;
};

export const updateMarkers = async (markers) => {
  const response = await api.put('/settings/markers', { markers });
  return response;
};

export const reorderMarkers = async (order) => {
  const response = await api.patch('/settings/markers/reorder', { order });
  return response;
};

export const resetSystem = async () => {
  const response = await api.delete('/settings/system/reset');
  return response;
};
