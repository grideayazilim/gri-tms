import { useState, useCallback } from 'react';
import { announcementService } from '../../api';

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnnouncements = useCallback(async (page = 1, limit = 20) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await announcementService.getAnnouncements(page, limit);
      if (response && response.data) {
        setAnnouncements(response.data.announcements || []);
        setPagination(response.data.pagination);
      }
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message || 'Duyurular alınırken hata oluştu');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addAnnouncement = async (title, content) => {
    try {
      const response = await announcementService.createAnnouncement(title, content);
      // We refetch to maintain ordering and pagination correctness
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
    fetchAnnouncements,
    addAnnouncement,
    editAnnouncement,
    removeAnnouncement
  };
};