/* ========================================================================
   ANNOUNCEMENT SERVICE (DUYURU SERVİSİ)
   Duyuru listeleme ve okundu işaretleme işlemleri.
   ======================================================================== */
import { api } from './httpClient';


export const getAnnouncements = async (page = 1, limit = 20) => {
  const response = await api.get(`/announcements?page=${page}&limit=${limit}`);
  return response;
};

export const createAnnouncement = async (title, content) => {
  const response = await api.post('/announcements', { title, content });
  return response;
};

export const updateAnnouncement = async (id, title, content) => {
  const response = await api.put(`/announcements/${id}`, { title, content });
  return response;
};

export const deleteAnnouncement = async (id) => {
  const response = await api.delete(`/announcements/${id}`);
  return response;
};

export const getUnreadCount = async () => {
  const response = await api.get('/announcements/unread-count');
  return response;
};

export const markAsRead = async (id) => {
  const response = await api.post(`/announcements/${id}/read`);
  return response;
};