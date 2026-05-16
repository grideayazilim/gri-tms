import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementList from './AnnouncementList';
import AnnouncementForm from './AnnouncementForm';
import { ModalProvider } from '../Modal/ModalContext';
import { ToastProvider } from '../ToastBar/ToastContext';

/*
  Announcements Bileşen Testleri
*/

const mockAnnouncement = {
  id: 'ann-1',
  title: 'Test Duyurusu',
  content: 'Bu bir test duyurusu içeriğidir.',
  createdAt: '2024-03-20T10:00:00Z',
  isRead: false,
};

// ─── AnnouncementCard ──────────────────────────────────────────────────────────

describe('AnnouncementCard Bileşeni', () => {
  it('duyuru bilgilerini doğru şekilde render etmeli', () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />,
    );

    expect(screen.getByText('Test Duyurusu')).toBeInTheDocument();
    expect(screen.getByText('Bu bir test duyurusu içeriğidir.')).toBeInTheDocument();
  });

  it('okunmamış duyuru için unread sınıfı eklenmeli', () => {
    const { container } = render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />,
    );

    expect(container.firstChild).toHaveClass('announcement-card--unread');
  });

  it('okunmuş duyuru için unread sınıfı olmamalı', () => {
    const { container } = render(
      <AnnouncementCard
        announcement={{ ...mockAnnouncement, isRead: true }}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />,
    );

    expect(container.firstChild).not.toHaveClass('announcement-card--unread');
  });

  it('Admin olmayan kullanıcı silme butonunu görmemeli', () => {
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={vi.fn()}
        isAdmin={false}
      />,
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
      />,
    );

    expect(screen.getByTitle('Sil')).toBeInTheDocument();
  });

  it('silme butonuna tıklanınca onDelete çağrılmalı', () => {
    const onDelete = vi.fn();
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        onDelete={onDelete}
        onRead={vi.fn()}
        isAdmin={true}
      />,
    );

    fireEvent.click(screen.getByTitle('Sil'));
    expect(onDelete).toHaveBeenCalledWith('ann-1');
  });

  it('fare üzerine geldiğinde onRead tetiklenmeli', () => {
    const onRead = vi.fn();
    render(
      <AnnouncementCard
        announcement={mockAnnouncement}
        onDelete={vi.fn()}
        onRead={onRead}
        isAdmin={false}
      />,
    );

    const card = screen.getByText('Test Duyurusu').closest('.announcement-card');
    if (card) fireEvent.mouseEnter(card);

    expect(onRead).toHaveBeenCalledWith('ann-1');
  });
});

// ─── AnnouncementForm ──────────────────────────────────────────────────────────

describe('AnnouncementForm Bileşeni', () => {
  it('başlık input ve içerik textarea render edilmeli', () => {
    const { container } = render(<AnnouncementForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(container.querySelector('input[name="title"]')).toBeInTheDocument();
    expect(container.querySelector('textarea[name="content"]')).toBeInTheDocument();
  });

  it('Vazgeç butonuna basınca onCancel çağrılmalı', () => {
    const onCancel = vi.fn();
    render(<AnnouncementForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Vazgeç'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('karakter sayacı güncellenmeli', () => {
    const { container } = render(<AnnouncementForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const textarea = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Merhaba dünya' } });

    expect(screen.getByText(/13 \/ 1000 karakter/)).toBeInTheDocument();
  });

  it('boş form submit edilince onSubmit çağrılmamalı', async () => {
    const onSubmit = vi.fn();
    render(<AnnouncementForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText('Oluştur'));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('dolu form submit edilince onSubmit çağrılmalı', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<AnnouncementForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
    const contentTextarea = container.querySelector('textarea[name="content"]') as HTMLTextAreaElement;

    await userEvent.type(titleInput, 'Yeni Duyuru');
    await userEvent.type(contentTextarea, 'Duyuru içeriği burada.');

    fireEvent.click(screen.getByText('Oluştur'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Yeni Duyuru', content: 'Duyuru içeriği burada.' }),
        expect.anything(),
      );
    });
  });
});

// ─── AnnouncementList ──────────────────────────────────────────────────────────

const mockFetchAnnouncements = vi.fn();
const mockMarkAsRead = vi.fn();
const mockAddAnnouncement = vi.fn();
const mockRemoveAnnouncement = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ isAdmin: false, user: null })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../hooks/data/useAnnouncements', () => ({
  useAnnouncements: vi.fn(() => ({
    announcements: [],
    isLoading: false,
    error: null,
    fetchAnnouncements: mockFetchAnnouncements,
    markAsRead: mockMarkAsRead,
    addAnnouncement: mockAddAnnouncement,
    removeAnnouncement: mockRemoveAnnouncement,
  })),
}));

import { useAuth } from '../../context/AuthContext';
import { useAnnouncements } from '../../hooks/data/useAnnouncements';

function renderList() {
  return render(
    <ToastProvider>
      <ModalProvider>
        <AnnouncementList />
      </ModalProvider>
    </ToastProvider>,
  );
}

describe('AnnouncementList Bileşeni', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ isAdmin: false, user: null } as any);
    vi.mocked(useAnnouncements).mockReturnValue({
      announcements: [],
      isLoading: false,
      error: null,
      fetchAnnouncements: mockFetchAnnouncements,
      markAsRead: mockMarkAsRead,
      addAnnouncement: mockAddAnnouncement,
      removeAnnouncement: mockRemoveAnnouncement,
    } as any);
  });

  it('mount olunca fetchAnnouncements çağrılmalı', () => {
    renderList();
    expect(mockFetchAnnouncements).toHaveBeenCalled();
  });

  it('duyuru listesi boş olduğunda boş durum mesajı gösterilmeli', () => {
    renderList();
    expect(screen.getByText('Henüz duyuru yok')).toBeInTheDocument();
  });

  it('isLoading aktifken yükleniyor animasyonu gösterilmeli', () => {
    vi.mocked(useAnnouncements).mockReturnValue({
      announcements: [],
      isLoading: true,
      error: null,
      fetchAnnouncements: mockFetchAnnouncements,
      markAsRead: mockMarkAsRead,
      addAnnouncement: mockAddAnnouncement,
      removeAnnouncement: mockRemoveAnnouncement,
    } as any);

    const { container } = renderList();
    expect(container.querySelector('.announcement-list__loading')).toBeInTheDocument();
  });

  it('hata varken hata mesajı gösterilmeli', () => {
    vi.mocked(useAnnouncements).mockReturnValue({
      announcements: [],
      isLoading: false,
      error: 'Bağlantı hatası',
      fetchAnnouncements: mockFetchAnnouncements,
      markAsRead: mockMarkAsRead,
      addAnnouncement: mockAddAnnouncement,
      removeAnnouncement: mockRemoveAnnouncement,
    } as any);

    renderList();
    expect(screen.getByText(/Bağlantı hatası/)).toBeInTheDocument();
  });

  it('duyurular varken liste render edilmeli', () => {
    vi.mocked(useAnnouncements).mockReturnValue({
      announcements: [mockAnnouncement],
      isLoading: false,
      error: null,
      fetchAnnouncements: mockFetchAnnouncements,
      markAsRead: mockMarkAsRead,
      addAnnouncement: mockAddAnnouncement,
      removeAnnouncement: mockRemoveAnnouncement,
    } as any);

    renderList();
    expect(screen.getByText('Test Duyurusu')).toBeInTheDocument();
  });

  it('admin için "Yeni Duyuru Ekle" butonu görünmeli', () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true, user: null } as any);

    renderList();
    expect(screen.getByText('Yeni Duyuru Ekle')).toBeInTheDocument();
  });

  it('non-admin için "Yeni Duyuru Ekle" butonu görünmemeli', () => {
    renderList();
    expect(screen.queryByText('Yeni Duyuru Ekle')).not.toBeInTheDocument();
  });

  it('"Yeni Duyuru Ekle" butonuna tıklanınca modal açılmalı', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true, user: null } as any);

    renderList();
    await userEvent.click(screen.getByText('Yeni Duyuru Ekle'));

    expect(screen.getByText('Yeni Duyuru Ekle', { selector: 'h3' })).toBeInTheDocument();
  });

  it('silme işlemi onaylanınca removeAnnouncement çağrılmalı', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true, user: null } as any);
    vi.mocked(useAnnouncements).mockReturnValue({
      announcements: [mockAnnouncement],
      isLoading: false,
      error: null,
      fetchAnnouncements: mockFetchAnnouncements,
      markAsRead: mockMarkAsRead,
      addAnnouncement: mockAddAnnouncement,
      removeAnnouncement: mockRemoveAnnouncement.mockResolvedValue({ success: true }),
    } as any);

    renderList();

    await userEvent.click(screen.getByTitle('Sil'));

    // Confirm dialog açılmalı — "Duyuruyu Sil" modal başlığını bekle
    await waitFor(() => {
      expect(screen.getByText('Duyuruyu Sil')).toBeInTheDocument();
    });

    // Confirm dialog içindeki "Sil" butonuna tıkla (modal içinde)
    const confirmBtn = screen.getAllByRole('button', { name: 'Sil' }).find(
      (btn) => !btn.hasAttribute('title')
    );
    await userEvent.click(confirmBtn!);

    await waitFor(() => {
      expect(mockRemoveAnnouncement).toHaveBeenCalledWith('ann-1');
    });
  });

  it('silme başarısız olunca hata toast gösterilmeli', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true, user: null } as any);
    vi.mocked(useAnnouncements).mockReturnValue({
      announcements: [mockAnnouncement],
      isLoading: false,
      error: null,
      fetchAnnouncements: mockFetchAnnouncements,
      markAsRead: mockMarkAsRead,
      addAnnouncement: mockAddAnnouncement,
      removeAnnouncement: mockRemoveAnnouncement.mockResolvedValue({ success: false, error: 'Silinemedi' }),
    } as any);

    renderList();

    await userEvent.click(screen.getByTitle('Sil'));

    await waitFor(() => {
      expect(screen.getByText('Duyuruyu Sil')).toBeInTheDocument();
    });

    const confirmBtn = screen.getAllByRole('button', { name: 'Sil' }).find(
      (btn) => !btn.hasAttribute('title')
    );
    await userEvent.click(confirmBtn!);

    await waitFor(() => {
      expect(screen.getByText('Silinemedi')).toBeInTheDocument();
    });
  });
});
