/**
 * AnnouncementCard component tests (Phase 4 — Team B)
 * Coverage:
 *  1. Okunmamış state → `announcement-card--unread` CSS class
 *  2. Hover → onRead tetiklenir
 *  3. Admin → silme butonu görünür; normal user → görünmez
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnnouncementCard from '@/components/Announcements/AnnouncementCard';

const baseAnnouncement = {
  id: '1',
  title: 'Test Duyuru',
  content: 'Test içerik',
  createdAt: '2026-01-01T10:00:00Z',
  isRead: false,
};

describe('AnnouncementCard', () => {
  it('okunmamış durumda --unread class uygulanır', () => {
    const { container } = render(
      <AnnouncementCard
        announcement={baseAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />,
    );
    expect(container.firstChild).toHaveClass('announcement-card--unread');
  });

  it('okunmuş durum → --unread class olmaz', () => {
    const { container } = render(
      <AnnouncementCard
        announcement={{ ...baseAnnouncement, isRead: true }}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />,
    );
    expect(container.firstChild).not.toHaveClass('announcement-card--unread');
  });

  it('hover edilince okunmamış duyuru için onRead çağrılır', () => {
    const onRead = vi.fn();
    const { container } = render(
      <AnnouncementCard
        announcement={baseAnnouncement}
        onDelete={vi.fn()}
        onRead={onRead}
        isAdmin={false}
      />,
    );
    fireEvent.mouseEnter(container.firstChild!);
    expect(onRead).toHaveBeenCalledWith('1');
  });

  it('admin → silme butonu görünür', () => {
    render(
      <AnnouncementCard
        announcement={baseAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={true}
      />,
    );
    expect(screen.getByTitle('Sil')).toBeInTheDocument();
  });

  it('normal kullanıcı → silme butonu görünmez', () => {
    render(
      <AnnouncementCard
        announcement={baseAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />,
    );
    expect(screen.queryByTitle('Sil')).not.toBeInTheDocument();
  });
});
