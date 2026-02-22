import { api } from './httpClient';

export const register = async (username, password, role, unitId, locationId) => {
  const response = await api.post('/auth/register', {
    username,
    password,
    role,
    unitId,
    locationId,
  });
  return response;
};

export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response;
};

export const refreshToken = async () => {
  const response = await api.post('/auth/refresh');
  return response;
};