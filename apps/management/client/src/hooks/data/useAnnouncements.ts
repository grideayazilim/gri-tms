import { useState, useCallback } from 'react';

import type { AnnouncementItem, PaginationMeta, Result } from '@timesheet/shared';

import { announcementService } from '../../api';
import { useAsync } from '../useAsync';
import { getErrorMessage } from '../../utils/getErrorMessage';

export interface UseAnnouncementsReturn {
  announcements: AnnouncementItem[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  fetchUnreadCount: () => Promise<void>;
  fetchAnnouncements: (page?: number, limit?: number) => Promise<Result<{ announcements: AnnouncementItem[]; pagination: PaginationMeta }>>;
  markAsRead: (id: string) => Promise<Result<Record<string, never>>>;
  addAnnouncement: (title: string, content: string) => Promise<Result<{ announcement: AnnouncementItem }>>;
  editAnnouncement: (id: string, title: string, content: string) => Promise<Result<{ announcement: AnnouncementItem }>>;
  removeAnnouncement: (id: string) => Promise<Result<Record<string, never>>>;
}

export const useAnnouncements = (): UseAnnouncementsReturn => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { isLoading, error, run } = useAsync();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await announcementService.getUnreadCount();
      if (response.success && response.data && typeof response.data.unreadCount !== 'undefined') {
        setUnreadCount(response.data.unreadCount);
      }
    } catch {
      // Hata sessizce yutulur — unread badge gösterilmez
    }
  }, []);

  const fetchAnnouncements = useCallback((page = 1, limit = 100) => run(async () => {
    const response = await announcementService.getAnnouncements(page, limit);
    if (response.success && response.data) {
      setAnnouncements(response.data.announcements || []);
      setPagination(response.data.pagination);
      return response.data;
    }
    throw new Error(response.success ? 'Bilinmeyen hata' : response.message);
  }), [run]);

  const markAsRead = async (id: string): Promise<Result<Record<string, never>>> => {
    try {
      const response = await announcementService.markAsRead(id);
      if (response.success) {
        setAnnouncements(prev =>
          prev.map(ann => ann.id === id ? { ...ann, isRead: true } : ann)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return { success: true, data: {} };
      }
      return { success: false, error: response.message || 'Okundu olarak işaretlenemedi' };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Okundu olarak işaretlenemedi');
      return { success: false, error: message };
    }
  };

  const addAnnouncement = async (title: string, content: string): Promise<Result<{ announcement: AnnouncementItem }>> => {
    try {
      const response = await announcementService.createAnnouncement(title, content);
      if (response.success && response.data) {
        await fetchAnnouncements();
        return { success: true, data: response.data };
      }
      return { success: false, error: response.success ? 'Geçersiz veri' : response.message };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Duyuru oluşturulamadı');
      return { success: false, error: message };
    }
  };

  const editAnnouncement = async (id: string, title: string, content: string): Promise<Result<{ announcement: AnnouncementItem }>> => {
    try {
      const response = await announcementService.updateAnnouncement(id, title, content);
      if (response.success && response.data) {
        await fetchAnnouncements();
        return { success: true, data: response.data };
      }
      return { success: false, error: response.success ? 'Geçersiz veri' : response.message };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Duyuru güncellenemedi');
      return { success: false, error: message };
    }
  };

  const removeAnnouncement = async (id: string): Promise<Result<Record<string, never>>> => {
    try {
      const response = await announcementService.deleteAnnouncement(id);
      if (response.success) {
        await fetchAnnouncements();
        return { success: true, data: {} };
      }
      return { success: false, error: response.message || 'Duyuru silinemedi' };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Duyuru silinemedi');
      return { success: false, error: message };
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
