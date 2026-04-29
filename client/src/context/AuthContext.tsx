/* ========================================================================
   AUTH CONTEXT (KİMLİK DOĞRULAMA BAĞLAMI)
   Kullanıcı oturumunun tüm uygulama boyunca yönetilmesini sağlar.
   ======================================================================== */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

import { USER_ROLE } from '@timesheet/shared';
import type { AuthUser, Result } from '@timesheet/shared';

import { authService } from '../api';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: AuthUser | null;
  isBooting: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isResponsible: boolean;
  login: (username: string, password: string) => Promise<Result<Record<string, never>>>;
  /** Phase 2'de authService.register SignUpType payload'a geçince bu da güncellenecek */
  register: (
    username: string,
    password: string,
    role: string,
    unitId: string | null,
    locationId: string | null,
  ) => Promise<Result<Record<string, never>>>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<Result<Record<string, never>>>;
  updateProfile: (updatedUser: Partial<AuthUser>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // isBooting: uygulama ilk açıldığında /me kontrolü tamamlanana dek splash gösterir
  const [isBooting, setIsBooting] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async (): Promise<void> => {
    try {
      // Sayfa yenilendiğinde Cookie üzerinden mevcut oturumu geri yükle
      const response = await authService.getMe();
      setUser((response as { data?: { user?: AuthUser } }).data?.user ?? null);
      setIsAuthenticated(true);
    } catch {
      // Oturum yoksa veya süresi dolmuşsa state'leri sıfırla
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      // Boot süreci bitti, splash kapanabilir
      setIsBooting(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkAuth();
  }, []); // checkAuth sadece mount'ta bir kez çalışır

  const login = async (
    username: string,
    password: string,
  ): Promise<Result<Record<string, never>>> => {
    try {
      const response = await authService.login(username, password);
      const loggedInUser = (response as { data?: { user?: AuthUser } }).data?.user;
      if (!loggedInUser) throw new Error('Invalid response structure');
      setUser(loggedInUser);
      setIsAuthenticated(true);
      return { success: true, data: {} };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Kullanıcı adı veya şifre yanlış';
      return { success: false, error: message };
    }
  };

  const register = async (
    username: string,
    password: string,
    role: string,
    unitId: string | null,
    locationId: string | null,
  ): Promise<Result<Record<string, never>>> => {
    try {
      const response = await authService.register(username, password, role, unitId, locationId);
      const registered = (response as { data?: { user?: AuthUser } }).data?.user;
      if (!registered) throw new Error('Invalid response structure');
      return { success: true, data: {} };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Kayıt başarısız';
      return { success: false, error: message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Sunucu tarafındaki session cookie'lerini temizle
      await authService.logout();
    } catch {
      // Hata olsa bile (örn: internet kesik) uygulama state'ini sıfırla
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  const changePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<Result<Record<string, never>>> => {
    try {
      await authService.changePassword(oldPassword, newPassword);
      return { success: true, data: {} };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Şifre değiştirme başarısız';
      return { success: false, error: message };
    }
  };

  const updateProfile = (updatedUser: Partial<AuthUser>): void => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
  };

  const isAdmin = user?.role === USER_ROLE.ADMIN;
  const isResponsible = user?.role === USER_ROLE.RESPONSIBLE;

  const value: AuthContextValue = {
    user,
    isBooting,
    isAuthenticated,
    login,
    register,
    logout,
    changePassword,
    updateProfile,
    isAdmin,
    isResponsible,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
