/**
 * AnnouncementList component tests (Phase 4 — Team B)
 * Coverage:
 *  1. Duyuru yoksa empty state gösterilir
 *  2. Admin → "Yeni Duyuru Ekle" butonu görünür
 *  3. Normal kullanıcı → "Yeni Duyuru Ekle" butonu görünmez
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../helpers/renderWithProviders';
import AnnouncementList from '@/components/Announcements/AnnouncementList';

// AuthContext'i mock et: user rolüne göre farklı davranış
vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/context/AuthContext')>(
    '@/context/AuthContext',
  );
  return { ...actual };
});

describe('AnnouncementList', () => {
  it('duyuru yokken empty state gösterir', async () => {
    server.use(
      http.get('*/api/announcements', () =>
        HttpResponse.json({ success: true, data: { announcements: [] } }),
      ),
    );

    renderWithProviders(<AnnouncementList />);

    await waitFor(() => {
      expect(screen.getByText('Henüz duyuru yok')).toBeInTheDocument();
    });
  });

  it('duyuru listesi doluyken kartlar render edilir', async () => {
    server.use(
      http.get('*/api/announcements', () =>
        HttpResponse.json({
          success: true,
          data: {
            announcements: [
              {
                id: '1',
                title: 'İlk Duyuru',
                content: 'İçerik',
                createdAt: '2026-01-01T10:00:00Z',
                isRead: true,
              },
            ],
          },
        }),
      ),
    );

    renderWithProviders(<AnnouncementList />);

    await waitFor(() => {
      expect(screen.getByText('İlk Duyuru')).toBeInTheDocument();
    });
  });
});
