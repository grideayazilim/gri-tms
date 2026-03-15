import { api } from './httpClient';

export const getUsers = async (params = {}) => {
  return await api.get('/users', { params });
};

export const updateUser = async (userId, userData) => {
  return await api.put(`/users/${userId}`, userData);
};

export const deleteUser = async (userId) => {
  return await api.delete(`/users/${userId}`);
};

export const updateProfile = async (profileData) => {
  return await api.put('/users/me', profileData);
};