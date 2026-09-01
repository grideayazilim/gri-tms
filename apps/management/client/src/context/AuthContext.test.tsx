import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as authService from '../api/authService';

/*
  AuthContext Testleri
  - Uygulama başlatılınca session kontrolü (checkAuth)
  - login başarılı/başarısız
  - register başarılı/başarısız
  - logout
  - changePassword
  - updateProfile
  - isAdmin/isResponsible derived property'leri
*/

// authService'i mock'luyoruz — gerçek API çağrısı yapmasın
vi.mock('../api/authService');

const mockGetMe = vi.mocked(authService.getMe);
const mockLogin = vi.mocked(authService.login);
const mockLogout = vi.mocked(authService.logout);
const mockRegister = vi.mocked(authService.register);
const mockChangePassword = vi.mocked(authService.changePassword);
const mockChangeInitialPassword = vi.mocked(authService.changeInitialPassword);

const adminUser = {
  id: 1,
  username: 'testadmin',
  role: 'ADMIN' as const,
  locationId: null,
  unitId: null,
};

const responsibleUser = {
  id: 2,
  username: 'sorumlu',
  role: 'RESPONSIBLE' as const,
  locationId: 1,
  unitId: 2,
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── checkAuth (Boot) ─────────────────────────────────────────────────────

  describe('uygulama başlatılınca session kontrolü', () => {
    it('getMe başarılı ise kullanıcı ve isAuthenticated true olmalı', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(result.current.user).toEqual(adminUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('getMe başarısız ise user null ve isAuthenticated false olmalı', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('getMe hata fırlatırsa user null ve isBooting false olmalı', async () => {
      mockGetMe.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('boot süresince isBooting true olmalı', () => {
      mockGetMe.mockImplementation(() => new Promise(() => {})); // asla resolve etme

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isBooting).toBe(true);
    });
  });

  // ─── isAdmin / isResponsible ──────────────────────────────────────────────

  describe('rol derived property\'leri', () => {
    it('ADMIN kullanıcı için isAdmin true, isResponsible false olmalı', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isResponsible).toBe(false);
    });

    it('RESPONSIBLE kullanıcı için isAdmin false, isResponsible true olmalı', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: responsibleUser } } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isResponsible).toBe(true);
    });

    it('kullanıcı yokken isAdmin ve isResponsible false olmalı', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isResponsible).toBe(false);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('başarılı login sonrası user ve isAuthenticated güncellenmeli', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);
      mockLogin.mockResolvedValue({ success: true, data: { user: adminUser } } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login('testadmin', 'pass123');
      });

      expect(loginResult.success).toBe(true);
      expect(result.current.user).toEqual(adminUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('başarısız login sonrası error mesajı dönmeli', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);
      mockLogin.mockResolvedValue({ success: false, message: 'Kullanıcı adı veya şifre yanlış' } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login('yanlis', 'yanlis');
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Kullanıcı adı veya şifre yanlış');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('login API hatası fırlatırsa hata mesajı dönmeli', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);
      mockLogin.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      let loginResult: any;
      await act(async () => {
        loginResult = await result.current.login('user', 'pass');
      });

      expect(loginResult.success).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('başarılı register sonrası success: true dönmeli', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);
      mockRegister.mockResolvedValue({ success: true, data: {} } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      let regResult: any;
      await act(async () => {
        regResult = await result.current.register({
          username: 'yeni',
          password: 'pass1234',
          role: 'ADMIN',
        } as any);
      });

      expect(regResult.success).toBe(true);
    });

    it('başarısız register sonrası error mesajı dönmeli', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);
      mockRegister.mockResolvedValue({ success: false, message: 'Kayıt başarısız' } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      let regResult: any;
      await act(async () => {
        regResult = await result.current.register({ username: 'x', password: 'y', role: 'ADMIN' } as any);
      });

      expect(regResult.success).toBe(false);
      expect(regResult.error).toBe('Kayıt başarısız');
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('logout sonrası user null ve isAuthenticated false olmalı', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);
      mockLogout.mockResolvedValue({ success: true, data: {} } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('logout API hatası fırlassa bile state temizlenmeli', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);
      mockLogout.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('başarılı şifre değişikliği success: true dönmeli', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);
      mockChangePassword.mockResolvedValue({ success: true, data: {} } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      let cpResult: any;
      await act(async () => {
        cpResult = await result.current.changePassword('eskiSifre', 'yeniSifre');
      });

      expect(cpResult.success).toBe(true);
    });

    it('başarısız şifre değişikliği error mesajı dönmeli', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);
      mockChangePassword.mockRejectedValue(new Error('Şifre yanlış'));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      let cpResult: any;
      await act(async () => {
        cpResult = await result.current.changePassword('yanlis', 'yeni');
      });

      expect(cpResult.success).toBe(false);
      expect(cpResult.error).toBeTruthy();
    });
  });

  // ─── updateProfile ────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('profil güncellenince user state merge edilmeli', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      act(() => {
        result.current.updateProfile({ username: 'guncel_admin' });
      });

      expect(result.current.user?.username).toBe('guncel_admin');
      expect(result.current.user?.role).toBe('ADMIN'); // diğer alanlar korunmalı
    });

    it('kullanıcı yokken updateProfile çağrılsa bile hata olmamalı', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isBooting).toBe(false));

      expect(() => {
        act(() => {
          result.current.updateProfile({ username: 'test' });
        });
      }).not.toThrow();

      expect(result.current.user).toBeNull();
    });
  });

  // ─── useAuth Hook Güvenliği ───────────────────────────────────────────────

  it('useAuth AuthProvider dışında kullanılırsa hata fırlatmalı', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  it('AuthProvider çocukları render etmeli', async () => {
    mockGetMe.mockResolvedValue({ success: false } as any);

    render(
      <AuthProvider>
        <div data-testid="child">Çocuk Bileşen</div>
      </AuthProvider>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  /* Zorunlu şifre değişimi — bayrak ve akış. */
  describe('mustChangePassword akışı', () => {
    it('kullanıcı bayrağı true ise mustChangePassword true olur', async () => {
      mockGetMe.mockResolvedValue({
        success: true,
        data: { user: { ...adminUser, mustChangePassword: true } },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isBooting).toBe(false));
      expect(result.current.mustChangePassword).toBe(true);
    });

    it('bayrak yoksa mustChangePassword false olur', async () => {
      mockGetMe.mockResolvedValue({ success: true, data: { user: adminUser } } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isBooting).toBe(false));
      expect(result.current.mustChangePassword).toBe(false);
    });

    it('oturum yoksa mustChangePassword false olur', async () => {
      mockGetMe.mockResolvedValue({ success: false } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => expect(result.current.isBooting).toBe(false));
      expect(result.current.mustChangePassword).toBe(false);
    });

    it('şifre değişimi başarılı olunca bayrak temizlenir', async () => {
      mockGetMe.mockResolvedValue({
        success: true,
        data: { user: { ...adminUser, mustChangePassword: true } },
      } as any);
      mockChangeInitialPassword.mockResolvedValue({
        success: true,
        data: { user: { ...adminUser, mustChangePassword: false } },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.mustChangePassword).toBe(true));

      await act(async () => {
        await result.current.changeInitialPassword('Guclu-Sifre-2026', 'Guclu-Sifre-2026');
      });

      expect(result.current.mustChangePassword).toBe(false);
    });

    it('sunucu hatası Result.error olarak döner ve bayrak açık kalır', async () => {
      mockGetMe.mockResolvedValue({
        success: true,
        data: { user: { ...adminUser, mustChangePassword: true } },
      } as any);
      mockChangeInitialPassword.mockRejectedValue({ message: 'Şifreler eşleşmiyor', status: 400 });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.mustChangePassword).toBe(true));

      let res: { success: boolean; error?: string } | undefined;
      await act(async () => {
        res = await result.current.changeInitialPassword('Guclu-Sifre-2026', 'Baska-2026');
      });

      expect(res?.success).toBe(false);
      expect(result.current.mustChangePassword).toBe(true);
    });
  });
});
