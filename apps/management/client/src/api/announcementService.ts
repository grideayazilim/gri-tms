/* ========================================================================
   ANNOUNCEMENT SERVICE (DUYURU SERVİSİ)
   Duyuru listeleme ve okundu işaretleme işlemleri.
   ======================================================================== */
import type { ApiResponse, PaginationMeta, AnnouncementItem } from '@timesheet/shared';

import { api } from './httpClient';

// ─── Servis ───────────────────────────────────────────────────────────────────

export const getAnnouncements = (page = 1, limit = 100) =>
  api.get<ApiResponse<{ announcements: AnnouncementItem[]; pagination: PaginationMeta }>>(
    '/announcements',
    { params: { page, limit } },
  );

export const createAnnouncement = (title: string, content: string) =>
  api.post<ApiResponse<{ announcement: AnnouncementItem }>>('/announcements', { title, content });

export const updateAnnouncement = (id: string, title: string, content: string) =>
  api.put<ApiResponse<{ announcement: AnnouncementItem }>>(`/announcements/${id}`, { title, content });

export const deleteAnnouncement = (id: string) =>
  api.delete<ApiResponse<Record<string, never>>>(`/announcements/${id}`);

export const getUnreadCount = () =>
  api.get<ApiResponse<{ unreadCount: number }>>('/announcements/unread-count');

export const markAsRead = (id: string) =>
  api.post<ApiResponse<Record<string, never>>>(`/announcements/${id}/read`);
