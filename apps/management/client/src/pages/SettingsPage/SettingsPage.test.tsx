import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from './SettingsPage';
import { ModalProvider } from '../../components/Modal/ModalContext';
import { ToastProvider } from '../../components/ToastBar/ToastContext';

/*
  SettingsPage Entegrasyon Testi (Memory Optimized)
*/

// --- MOCKLAR ---
vi.mock('./PendingUserList/PendingUserList', () => ({
  default: ({ pendingUsers, onApprove }: { pendingUsers: Array<{ id: string; username: string }>; onApprove: (id: string) => void }) => (
    <div data-testid="mock-pending-list">
      {pendingUsers.map((u) => (
        <div key={u.id}>
          <span>{u.username}</span>
          <button onClick={() => onApprove(u.id)}>Onayla</button>
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../components/PageShell/PageShell', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}));

vi.mock('framer-motion', () => ({
  motion: { 
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    main: ({ children }: { children: React.ReactNode }) => <main>{children}</main>
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUpdateProfile = vi.fn();
const mockEditProfile = vi.fn();
const mockApproveUser = vi.fn();
const mockUpdateSystemSettings = vi.fn();
const mockResetSystem = vi.fn();

vi.mock('../../api/settingsService', () => ({
  resetSystem: (...args: any[]) => mockResetSystem(...args)
}));

vi.mock('../../context/AuthContext', () => {
  const stableUser = { username: 'testadmin', role: 'ADMIN' };
  return {
    useAuth: () => ({ 
      isAdmin: true, 
      user: stableUser,
      updateProfile: mockUpdateProfile,
      logout: vi.fn()
    }),
  };
});

vi.mock('../../hooks/data/useSettings', () => {
  const stableSystemSettings = { dailyWage: 100, maxWeeklyDays: 5, programStartDate: '2024-01-01', programEndDate: '2024-12-31' };
  const stablePendingUsers = [{ id: 'u1', username: 'pending_user' }];
  
  return {
    useSettings: () => ({
      systemSettings: stableSystemSettings,
      fetchSystemSettings: vi.fn(),
      updateSystemSettings: mockUpdateSystemSettings,
      pendingUsers: stablePendingUsers,
      fetchPendingUsers: vi.fn(),
      approveUser: mockApproveUser,
      rejectUser: vi.fn(),
    }),
  };
});

vi.mock('../../hooks/data/useUsers', () => ({
  useUsers: () => ({
    editProfile: mockEditProfile,
  }),
}));

function renderSettingsPage() {
  return render(
    <ToastProvider>
      <ModalProvider>
        <SettingsPage />
      </ModalProvider>
    </ToastProvider>
  );
}

describe('SettingsPage (Yönetim)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sayfa başlığı ve form alanları render edilmeli', () => {
    renderSettingsPage();
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
    expect(screen.getByText('Giriş Bilgileri')).toBeInTheDocument();
    expect(screen.getByLabelText('Kullanıcı Adı')).toBeInTheDocument();
  });

  it('admin için sistem ayarları bölümü görünmeli', () => {
    renderSettingsPage();
    expect(screen.getByText('Sistem Ayarları')).toBeInTheDocument();
    expect(screen.getByText('Sistem Sıfırlama')).toBeInTheDocument();
  });

  it('profil bilgilerini güncelleyebilmeli', async () => {
    mockEditProfile.mockResolvedValue({ success: true, data: { user: { username: 'yeni_admin' } } });
    renderSettingsPage();

    const usernameInput = screen.getByLabelText('Kullanıcı Adı');
    fireEvent.change(usernameInput, { target: { value: 'yeni_admin' } });

    const saveBtn = screen.getByText('Giriş Bilgilerini Güncelle');
    fireEvent.click(saveBtn);

    await waitFor(() => expect(mockEditProfile).toHaveBeenCalled());
  });

  it('profil güncelleme başarılı olunca başarı toast\'ı görünmeli', async () => {
    mockEditProfile.mockResolvedValue({ success: true, data: { user: { username: 'yeni_admin' } } });
    renderSettingsPage();

    const usernameInput = screen.getByLabelText('Kullanıcı Adı');
    fireEvent.change(usernameInput, { target: { value: 'yeni_admin' } });
    fireEvent.click(screen.getByText('Giriş Bilgilerini Güncelle'));

    await waitFor(() => {
      expect(screen.getByText('Giriş bilgileriniz güncellendi.')).toBeInTheDocument();
    });
  });

  it('profil güncelleme başarısız olunca hata toast\'ı görünmeli', async () => {
    mockEditProfile.mockResolvedValue({ success: false, error: 'Güncelleme başarısız.' });
    renderSettingsPage();

    const usernameInput = screen.getByLabelText('Kullanıcı Adı');
    fireEvent.change(usernameInput, { target: { value: 'yeni_admin' } });
    fireEvent.click(screen.getByText('Giriş Bilgilerini Güncelle'));

    await waitFor(() => {
      expect(screen.getByText('Güncelleme başarısız.')).toBeInTheDocument();
    });
  });

  it('bekleyen kullanıcıları onaylayabilmeli', async () => {
    mockApproveUser.mockResolvedValue({ success: true });
    renderSettingsPage();

    expect(screen.getByText('pending_user')).toBeInTheDocument();
    const approveBtn = screen.getByText('Onayla');
    fireEvent.click(approveBtn);

    await waitFor(() => expect(mockApproveUser).toHaveBeenCalledWith('u1'));
  });

  it('onaylama başarılı olunca toast göstermeli', async () => {
    mockApproveUser.mockResolvedValue({ success: true });
    renderSettingsPage();

    fireEvent.click(screen.getByText('Onayla'));

    await waitFor(() => {
      expect(screen.getByText('Kullanıcı başarıyla onaylandı.')).toBeInTheDocument();
    });
  });

  it('sistem ayarlarını güncelleyebilmeli', async () => {
    mockUpdateSystemSettings.mockResolvedValue({ success: true });
    renderSettingsPage();

    const wageInputs = screen.getAllByLabelText('Günlük Ödenek (₺)');
    fireEvent.change(wageInputs[0]!, { target: { value: '150' } });

    const saveSystemBtn = screen.getByText('Sistem Ayarlarını Güncelle');
    fireEvent.click(saveSystemBtn);

    await waitFor(() => expect(mockUpdateSystemSettings).toHaveBeenCalled());
  });

  it('sistem ayarları güncellenince başarı toast\'ı görünmeli', async () => {
    mockUpdateSystemSettings.mockResolvedValue({ success: true });
    renderSettingsPage();

    const wageInputs = screen.getAllByLabelText('Günlük Ödenek (₺)');
    fireEvent.change(wageInputs[0]!, { target: { value: '150' } });
    fireEvent.click(screen.getByText('Sistem Ayarlarını Güncelle'));

    await waitFor(() => {
      expect(screen.getByText('Sistem ayarları güncellendi.')).toBeInTheDocument();
    });
  });

  it('yedekli reset radio\'su varsayılan olarak seçili olmalı', () => {
    renderSettingsPage();
    const withBackupRadio = screen.getByDisplayValue('with');
    expect(withBackupRadio).toBeChecked();
  });

  it('yedeksiz reset radio\'suna tıklayınca değişmeli', () => {
    renderSettingsPage();
    const withoutBackupRadio = screen.getByDisplayValue('without');
    fireEvent.click(withoutBackupRadio);
    expect(withoutBackupRadio).toBeChecked();
  });

  it('"Yerleşke ve birimleri de sil" checkbox\'ı toggle edilebilmeli', () => {
    renderSettingsPage();
    const checkbox = screen.getByLabelText('Yerleşke ve birimleri de sil');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('reset butonuna basılınca eksik alan varsa hata toast\'ı göstermeli', async () => {
    renderSettingsPage();

    const resetBtn = screen.getByText('Sistemi Sıfırla');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText('Geçerli bir günlük ücret giriniz.')).toBeInTheDocument();
    });
  });

  it('reset form doldurulunca confirm dialog açılmalı', async () => {
    renderSettingsPage();

    const dailyWageInputs = screen.getAllByLabelText('Günlük Ödenek (₺)');
    fireEvent.change(dailyWageInputs[1]!, { target: { value: '100' } });

    const weeklyDayInputs = screen.getAllByLabelText('Haftalık Çalışma Sınırı (Gün)');
    fireEvent.change(weeklyDayInputs[1]!, { target: { value: '5' } });

    fireEvent.change(screen.getByLabelText('Yeni Program Başlangıcı'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('Yeni Program Bitişi'), { target: { value: '2025-12-31' } });

    const resetBtn = screen.getByText('Sistemi Sıfırla');
    fireEvent.click(resetBtn);

    // Confirm dialog açılmalı — "İptal" butonu sadece confirm dialog'da olur
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'İptal' })).toBeInTheDocument();
    });
  });

  it('başlangıç tarihi bitiş tarihinden büyük ise hata toast\'ı göstermeli', async () => {
    renderSettingsPage();

    const dailyWageInputs = screen.getAllByLabelText('Günlük Ödenek (₺)');
    fireEvent.change(dailyWageInputs[1]!, { target: { value: '100' } });

    const weeklyDayInputs = screen.getAllByLabelText('Haftalık Çalışma Sınırı (Gün)');
    fireEvent.change(weeklyDayInputs[1]!, { target: { value: '5' } });

    fireEvent.change(screen.getByLabelText('Yeni Program Başlangıcı'), { target: { value: '2025-12-31' } });
    fireEvent.change(screen.getByLabelText('Yeni Program Bitişi'), { target: { value: '2025-01-01' } });

    fireEvent.click(screen.getByText('Sistemi Sıfırla'));

    await waitFor(() => {
      expect(screen.getByText('Bitiş tarihi başlangıç tarihinden sonra olmalıdır.')).toBeInTheDocument();
    });
  });
});
