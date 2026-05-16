import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementList from './AnnouncementList';
import { AuthProvider } from '../../context/AuthContext';
import { ModalProvider } from '../Modal/ModalContext';
import { ToastProvider } from '../ToastBar/ToastContext';

/*
  Announcements Bileşen Testleri
  Bu testler duyuru kartlarının render edilmesini, yetki bazlı buton görünürlüğünü
  ve boş liste durumlarını kontrol eder.
*/

const mockAnnouncement = {
  id: 'ann-1',
  title: 'Test Duyurusu',
  content: 'Bu bir test duyurusu içeriğidir.',
  createdAt: '2024-03-20T10:00:00Z',
  isRead: false
};

describe('AnnouncementCard Bileşeni', () => {
  it('duyuru bilgilerini doğru şekilde render etmeli', () => {
    render(
      <AnnouncementCard 
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />
    );

    expect(screen.getByText('Test Duyurusu')).toBeInTheDocument();
    expect(screen.getByText('Bu bir test duyurusu içeriğidir.')).toBeInTheDocument();
  });

  it('okunmamış duyuru için özel sınıf (unread) eklenmeli', () => {
    const { container } = render(
      <AnnouncementCard 
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />
    );

    const card = container.firstChild;
    expect(card).toHaveClass('announcement-card--unread');
  });

  it('Admin olmayan kullanıcı silme butonunu görmemeli', () => {
    render(
      <AnnouncementCard 
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />
    );

    expect(screen.queryByTitle('Sil')).not.toBeInTheDocument();
  });

  it('Admin kullanıcı silme butonunu görmeli', () => {
    render(
      <AnnouncementCard 
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={true}
      />
    );

    expect(screen.getByTitle('Sil')).toBeInTheDocument();
  });

  it('Fare üzerine geldiğinde onRead tetiklenmeli', () => {
    const onReadMock = vi.fn();
    render(
      <AnnouncementCard 
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={onReadMock}
        isAdmin={false}
      />
    );

    const card = screen.getByText('Test Duyurusu').closest('.announcement-card');
    if (card) fireEvent.mouseEnter(card);

    expect(onReadMock).toHaveBeenCalledWith('ann-1');
  });
});

/* 
  AnnouncementList testi için Auth ve Modal Provider'lar gerekiyor 
  çünkü liste bu context'leri kullanıyor.
*/
vi.mock('../../hooks/data/useAnnouncements', () => ({
  useAnnouncements: () => ({
    announcements: [],
    isLoading: false,
    error: null,
    fetchAnnouncements: vi.fn(),
    markAsRead: vi.fn(),
    addAnnouncement: vi.fn(),
    removeAnnouncement: vi.fn(),
  })
}));

describe('AnnouncementList Bileşeni', () => {
  it('duyuru listesi boş olduğunda boş durum mesajı gösterilmeli', () => {
    render(
      <AuthProvider>
        <ModalProvider>
          <ToastProvider>
            <AnnouncementList />
          </ToastProvider>
        </ModalProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Henüz duyuru yok')).toBeInTheDocument();
  });
});
