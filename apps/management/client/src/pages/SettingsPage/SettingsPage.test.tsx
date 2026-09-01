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
const mockDownloadBackupZip = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../api/settingsService', () => ({
  resetSystem: (...args: any[]) => mockResetSystem(...args),
  downloadBackupZip: (...args: any[]) => mockDownloadBackupZip(...args),
}));

vi.mock('../../context/AuthContext', () => {
  const stableUser = { username: 'testadmin', role: 'ADMIN' };
  return {
    useAuth: () => ({ 
      isAdmin: true, 
      user: stableUser,
      updateProfile: mockUpdateProfile,
      logout: mockLogout
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

  /* Genel "emin misiniz?" onayı yerine SIFIRLA yazma adımı geldi —
     sistemdeki en yıkıcı işlemde kas hafızasıyla tıklamayı engellemek için. */
  function fillResetForm() {
    const dailyWageInputs = screen.getAllByLabelText('Günlük Ödenek (₺)');
    fireEvent.change(dailyWageInputs[1]!, { target: { value: '100' } });

    const weeklyDayInputs = screen.getAllByLabelText('Haftalık Çalışma Sınırı (Gün)');
    fireEvent.change(weeklyDayInputs[1]!, { target: { value: '5' } });

    fireEvent.change(screen.getByLabelText('Yeni Program Başlangıcı'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('Yeni Program Bitişi'), { target: { value: '2025-12-31' } });
  }

  /* Sayfadaki tetikleyici düğme de "Sistemi Sıfırla" adını taşıyor; modaldaki
     en sondaki (aktif) olanı al. */
  function confirmButton(): HTMLElement {
    const buttons = screen.getAllByRole('button', { name: 'Sistemi Sıfırla' });
    return buttons[buttons.length - 1]!;
  }

  /** Formu doldurur, onay modalını açar, SIFIRLA yazıp onaylar. */
  async function fillAndConfirmReset() {
    fillResetForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sistemi Sıfırla' }));

    // Onay düğmesi ancak SIFIRLA birebir yazılınca açılır
    const confirmInput = await screen.findByLabelText(/Onaylamak için/);
    fireEvent.change(confirmInput, { target: { value: 'SIFIRLA' } });
    fireEvent.click(confirmButton());
  }

  it('reset form doldurulunca onay modalı açılmalı ve düğme kapalı gelmeli', async () => {
    renderSettingsPage();

    fillResetForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sistemi Sıfırla' }));

    const confirmInput = await screen.findByLabelText(/Onaylamak için/);
    expect(confirmInput).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });

  it('onay düğmesi yanlış kelime yazılınca da kapalı kalmalı', async () => {
    renderSettingsPage();

    fillResetForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sistemi Sıfırla' }));

    const confirmInput = await screen.findByLabelText(/Onaylamak için/);
    fireEvent.change(confirmInput, { target: { value: 'sifirla' } });
    expect(confirmButton()).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: 'SIFIRLA' } });
    expect(confirmButton()).toBeEnabled();
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

  /* Yedek, sıfırlamadan ayrı bir istekte alınır: tek uzun istekte timeout'a
     takılan bağlantı sunucudaki silmeyi durdurmazdı. */
  describe('Yedekli sıfırlama akışı', () => {
    it('yedekli modda ÖNCE yedek indirilir SONRA sıfırlama yapılır', async () => {
      mockDownloadBackupZip.mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));
      mockResetSystem.mockResolvedValue({ success: true, data: { deleted: { employees: 3, users: 1, periods: 2 } } });

      renderSettingsPage();
      await fillAndConfirmReset();

      await waitFor(() => expect(mockResetSystem).toHaveBeenCalled());
      expect(mockDownloadBackupZip).toHaveBeenCalledOnce();

      // Sıfırlama isteği artık backup taşımaz — yedek ayrı uçtan alındı
      expect(mockResetSystem).toHaveBeenCalledWith(
        expect.objectContaining({ backup: false }),
      );
    });

    it('yedek başarısız olursa sıfırlama HİÇ çalışmaz (veri silinmez)', async () => {
      mockDownloadBackupZip.mockRejectedValue({ message: 'Yedek alınamadı', status: 500 });

      renderSettingsPage();
      await fillAndConfirmReset();

      await waitFor(() => expect(mockDownloadBackupZip).toHaveBeenCalled());
      expect(mockResetSystem).not.toHaveBeenCalled();
    });

    it('yedeksiz modda yedek ucu hiç çağrılmaz', async () => {
      mockResetSystem.mockResolvedValue({ success: true, data: { deleted: { employees: 3, users: 1, periods: 2 } } });

      renderSettingsPage();
      fireEvent.click(screen.getByDisplayValue('without'));
      await fillAndConfirmReset();

      await waitFor(() => expect(mockResetSystem).toHaveBeenCalled());
      expect(mockDownloadBackupZip).not.toHaveBeenCalled();
    });
  });

  /* Geri dönüşü olmayan bir işlemin sonucu kalıcı ve açık gösterilmeli:
     yedeğin geçerli olup olmadığı, verilerin silinip silinmediği ve tekrar
     denemenin güvenli olup olmadığı modalda yazar. */
  describe('sıfırlama sonucu kalıcı modalda gösterilir', () => {
    it('başarısızlıkta modal açılır, sunucu mesajını ve güvence metinlerini gösterir', async () => {
      mockDownloadBackupZip.mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));
      mockResetSystem.mockRejectedValue(
        new (class extends Error { status = 500; })('Veritabanı yetkisi eksik olduğu için işlem yapılamadı.'),
      );

      renderSettingsPage();
      await fillAndConfirmReset();

      expect(await screen.findByText('Sistem sıfırlanamadı')).toBeInTheDocument();
      // 1) Sunucunun mesajı birebir
      expect(screen.getByText('Veritabanı yetkisi eksik olduğu için işlem yapılamadı.')).toBeInTheDocument();
      // 2) Veriler yerinde (silme tek transaction, hata durumunda tamamı geri alınır)
      expect(screen.getByText('Verileriniz yerinde.')).toBeInTheDocument();
      // 3) Yedek alındıysa tekrar almaya gerek yok
      expect(screen.getByText(/İndirdiğiniz yedek geçerlidir/)).toBeInTheDocument();
      // 4) Tekrar denemek güvenli
      expect(screen.getByText(/güvenle tekrar deneyebilirsiniz/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hata detayını kopyala/ })).toBeInTheDocument();
    });

    it('hata modalı kendiliğinden kapanmaz', async () => {
      mockResetSystem.mockRejectedValue(new Error('Sunucu hatası'));

      renderSettingsPage();
      fireEvent.click(screen.getByDisplayValue('without'));
      await fillAndConfirmReset();

      expect(await screen.findByText('Sistem sıfırlanamadı')).toBeInTheDocument();

      // Toast'ların kaybolduğu süreden uzun bir bekleyişten sonra hâlâ açık olmalı
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(screen.getByText('Sistem sıfırlanamadı')).toBeInTheDocument();

      // Kullanıcı kapatana kadar oturum da kapanmaz
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('yedek ALINMADIYSA yedek cümlesi gösterilmez', async () => {
      mockResetSystem.mockRejectedValue(new Error('Sunucu hatası'));

      renderSettingsPage();
      fireEvent.click(screen.getByDisplayValue('without'));
      await fillAndConfirmReset();

      expect(await screen.findByText('Sistem sıfırlanamadı')).toBeInTheDocument();
      expect(screen.queryByText(/İndirdiğiniz yedek geçerlidir/)).not.toBeInTheDocument();
    });

    it('başarıda silinen sayıları gösterir ve logout yalnızca "Tamam" sonrası çalışır', async () => {
      mockResetSystem.mockResolvedValue({
        success: true,
        data: { deleted: { employees: 1012, users: 68, periods: 12 } },
      });

      renderSettingsPage();
      fireEvent.click(screen.getByDisplayValue('without'));
      await fillAndConfirmReset();

      expect(await screen.findByText('Sistem sıfırlandı')).toBeInTheDocument();
      expect(screen.getByText('1012 çalışan silindi')).toBeInTheDocument();
      expect(screen.getByText('68 kullanıcı silindi')).toBeInTheDocument();
      expect(screen.getByText('12 dönem silindi')).toBeInTheDocument();
      expect(screen.getByText(/oturumunuz kapatılacak/)).toBeInTheDocument();

      // Çıkış otomatik değil: kullanıcı modalı okuyup "Tamam"a basmalı
      expect(mockLogout).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Tamam' }));
      await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    });
  });
});