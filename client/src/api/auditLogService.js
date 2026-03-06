import { api } from './httpClient';

export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/audit-logs', { params });
  console.log(response);
  return response;
};