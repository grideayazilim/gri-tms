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
  default: ({ pendingUsers, onApprove }: any) => (
    <div data-testid="mock-pending-list">
      {pendingUsers.map((u: any) => (
        <div key={u.id}>
          <span>{u.username}</span>
          <button onClick={() => onApprove(u.id)}>Onayla</button>
        </div>
      ))}
    </div>
  )
}));

vi.mock('../../components/PageShell/PageShell', () => ({
  default: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  )
}));

vi.mock('framer-motion', () => ({
  motion: { 
    div: ({ children }: any) => <div>{children}</div>,
    main: ({ children }: any) => <main>{children}</main>
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockUpdateProfile = vi.fn();
const mockEditProfile = vi.fn();
const mockApproveUser = vi.fn();
const mockUpdateSystemSettings = vi.fn();

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

describe('SettingsPage (Yönetim)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('profil bilgilerini güncelleyebilmeli', async () => {
    mockEditProfile.mockResolvedValue({ success: true, data: { user: { username: 'yeni_admin' } } });
    render(
      <ToastProvider>
        <ModalProvider>
          <SettingsPage />
        </ModalProvider>
      </ToastProvider>
    );

    const usernameInput = screen.getByLabelText('Kullanıcı Adı');
    fireEvent.change(usernameInput, { target: { value: 'yeni_admin' } });

    const saveBtn = screen.getByText('Giriş Bilgilerini Güncelle');
    fireEvent.click(saveBtn);

    await waitFor(() => expect(mockEditProfile).toHaveBeenCalled());
  });

  it('bekleyen kullanıcıları onaylayabilmeli', async () => {
    mockApproveUser.mockResolvedValue({ success: true });
    render(
      <ToastProvider>
        <ModalProvider>
          <SettingsPage />
        </ModalProvider>
      </ToastProvider>
    );

    expect(screen.getByText('pending_user')).toBeInTheDocument();
    const approveBtn = screen.getByText('Onayla');
    fireEvent.click(approveBtn);

    await waitFor(() => expect(mockApproveUser).toHaveBeenCalledWith('u1'));
  });

  it('sistem ayarlarını güncelleyebilmeli', async () => {
    mockUpdateSystemSettings.mockResolvedValue({ success: true });
    render(
      <ToastProvider>
        <ModalProvider>
          <SettingsPage />
        </ModalProvider>
      </ToastProvider>
    );

    const wageInputs = screen.getAllByLabelText('Günlük Ödenek (₺)');
    fireEvent.change(wageInputs[0]!, { target: { value: '150' } });

    const saveSystemBtn = screen.getByText('Sistem Ayarlarını Güncelle');
    fireEvent.click(saveSystemBtn);

    await waitFor(() => expect(mockUpdateSystemSettings).toHaveBeenCalled());
  });
});
