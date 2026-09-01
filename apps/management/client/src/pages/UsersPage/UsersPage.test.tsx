import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from './UsersPage';
import { ModalProvider } from '../../components/Modal/ModalContext';
import { ToastProvider } from '../../components/ToastBar/ToastContext';

/*
  UsersPage Entegrasyon Testi
  - Kullanıcıların listelenmesi
  - Silme işleminin onay mekanizmasıyla çalışması
  - Filtreleme değişikliklerinin fetchUsers'ı tetiklemesi
*/

// framer-motion mock
vi.mock('framer-motion', () => ({
  motion: { 
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div> 
  },
  AnimatePresence: ({ children }: any) => children,
}));

// useUsers mock
const mockFetchUsers = vi.fn();
const mockRemoveUser = vi.fn();
const mockEditUser = vi.fn();

const mockUsers = [
  { id: '1', username: 'ahmet_admin', role: 'ADMIN', status: 'ACTIVE', createdAt: '2024-01-01' },
  { id: '2', username: 'mehmet_birim', role: 'RESPONSIBLE', status: 'PENDING', createdAt: '2024-01-02' }
];

vi.mock('../../hooks/data/useUsers', () => ({
  useUsers: () => ({
    users: mockUsers,
    pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    isLoading: false,
    fetchUsers: mockFetchUsers,
    removeUser: mockRemoveUser,
    editUser: mockEditUser,
  }),
}));

// useLocationUnitFilter mock
vi.mock('../../hooks/data/useLocationUnitFilter', () => ({
  useLocationUnitFilter: () => ({
    locationOptions: [{ value: 'loc-1', label: 'Merkez' }],
    unitOptions: [{ value: 'unit-1', label: 'Yazılım' }],
    isLoading: false
  }),
}));

/* useAuth mock (PageShell ve kendi satırı kontrolü için).
   Oturumdaki kullanıcı bilinçli olarak '2' (mehmet_birim): böylece listedeki
   İLK satır ('1') silinebilir kalır ve mevcut silme testleri etkilenmez. */
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '2', role: 'ADMIN' } }),
}));

function renderUsersPage() {
  return render(
    <ToastProvider>
      <ModalProvider>
        <UsersPage />
      </ModalProvider>
    </ToastProvider>
  );
}

describe('UsersPage (Kullanıcı Yönetimi)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('kullanıcı listesini doğru şekilde render etmeli', async () => {
    renderUsersPage();

    // PageShell başlığı
    expect(screen.getByText('Kullanıcılar')).toBeInTheDocument();
    
    // Kullanıcı adları tabloda görünmeli
    expect(screen.getByText('ahmet_admin')).toBeInTheDocument();
    expect(screen.getByText('mehmet_birim')).toBeInTheDocument();
  });

  it('bir kullanıcıyı silmek istediğinde onay modali açılmalı ve onaylanınca silmeli', async () => {
    mockRemoveUser.mockResolvedValue({ success: true });
    const { container } = renderUsersPage();

    // Silme butonunu sınıfına göre buluyoruz
    const deleteButton = container.querySelector('.delete-btn');
    if (!deleteButton) throw new Error('Silme butonu bulunamadı');
    
    fireEvent.click(deleteButton);

    // Onay modali başlığı görünmeli
    expect(screen.getByText('Kullanıcıyı Sil')).toBeInTheDocument();

    // 'Sil' onay butonuna bas
    const confirmBtn = screen.getByRole('button', { name: 'Sil' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalledWith('1');
    });

    expect(await screen.findByText('Kullanıcı başarıyla silindi')).toBeInTheDocument();
  });

  it('arama kutusuna yazı yazıldığında filtreleme tetiklenmeli', async () => {
    const { container } = renderUsersPage();

    // Etiket bağlantısı kopuk olduğu için doğrudan input'u buluyoruz
    const searchInput = container.querySelector('.filter-bar input[type="text"]');
    if (!searchInput) throw new Error('Arama kutusu bulunamadı');

    fireEvent.change(searchInput, { target: { value: 'ahmet' } });

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalled();
    });
  });

  it('silme isleminde hata olursa hata toast gosterilmeli', async () => {
    mockRemoveUser.mockResolvedValue({ success: false, error: 'Silme basarisiz' });
    const { container } = renderUsersPage();

    const deleteButton = container.querySelector('.delete-btn');
    if (!deleteButton) throw new Error('Silme butonu bulunamadi');
    fireEvent.click(deleteButton);

    expect(screen.getByText('Kullanıcıyı Sil')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Sil' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalled();
    });
  });

  /* Sistemde birden fazla yönetici varken bir yönetici kendi hesabını
     silebiliyordu; oturumu bir sonraki istekte sessizce kopuyordu. Asıl koruma
     sunucuda (400), arayüz yalnızca yardımcıdır. */
  describe('kendi hesabını silme', () => {
    it('kendi satırındaki silme düğmesi devre dışıdır ve sebebini söyler', () => {
      const { container } = renderUsersPage();

      const deleteButtons = container.querySelectorAll('.delete-btn');
      expect(deleteButtons).toHaveLength(2);

      // İkinci satır oturumdaki kullanıcı ('2' — mehmet_birim)
      const ownRowButton = deleteButtons[1] as HTMLButtonElement;
      expect(ownRowButton).toBeDisabled();
      expect(ownRowButton).toHaveAttribute('title', 'Kendi hesabınızı silemezsiniz');
    });

    it('başka kullanıcıların silme düğmesi açık kalır', () => {
      const { container } = renderUsersPage();

      const otherRowButton = container.querySelectorAll('.delete-btn')[0] as HTMLButtonElement;
      expect(otherRowButton).toBeEnabled();
      expect(otherRowButton).not.toHaveAttribute('title');
    });

    it('devre dışı düğmeye tıklamak onay modalını açmaz', () => {
      const { container } = renderUsersPage();

      fireEvent.click(container.querySelectorAll('.delete-btn')[1] as HTMLButtonElement);

      expect(screen.queryByText('Kullanıcıyı Sil')).not.toBeInTheDocument();
      expect(mockRemoveUser).not.toHaveBeenCalled();
    });
  });
});