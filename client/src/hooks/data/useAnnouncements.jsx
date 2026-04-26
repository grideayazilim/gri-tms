import { useState, useCallback } from 'react';
import { announcementService } from '../../api';
import { useAsync } from '../useAsync';

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isLoading, error, run } = useAsync();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await announcementService.getUnreadCount();
      if (response && response.data && typeof response.data.count !== 'undefined') {
        setUnreadCount(response.data.count);
      }
    } catch {
      // Hata sessizce yutulur — unread badge gösterilmez
    }
  }, []);

  const fetchAnnouncements = useCallback((page = 1, limit = 20) => run(async () => {
    const response = await announcementService.getAnnouncements(page, limit);
    if (response?.data) {
      setAnnouncements(response.data.announcements || []);
      setPagination(response.data.pagination);
    }
    return { success: true, data: response.data };
  }), [run]);

  const markAsRead = async (id) => {
    try {
      await announcementService.markAsRead(id);
      setAnnouncements(prev =>
        prev.map(ann => ann.id === id ? { ...ann, isRead: true, is_read: true } : ann)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const addAnnouncement = async (title, content) => {
    try {
      const response = await announcementService.createAnnouncement(title, content);
      await fetchAnnouncements();
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message || 'Duyuru oluşturulamadı' };
    }
  };

  const editAnnouncement = async (id, title, content) => {
    try {
      const response = await announcementService.updateAnnouncement(id, title, content);
      await fetchAnnouncements();
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message || 'Duyuru güncellenemedi' };
    }
  };

  const removeAnnouncement = async (id) => {
    try {
      const response = await announcementService.deleteAnnouncement(id);
      await fetchAnnouncements();
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message || 'Duyuru silinemedi' };
    }
  };

  return {
    announcements,
    pagination,
    isLoading,
    error,
    unreadCount,
    fetchUnreadCount,
    fetchAnnouncements,
    markAsRead,
    addAnnouncement,
    editAnnouncement,
    removeAnnouncement,
  };
};
