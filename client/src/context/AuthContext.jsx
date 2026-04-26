/* ========================================================================
   AUTH CONTEXT (KİMLİK DOĞRULAMA BAĞLAMI)
   Kullanıcı oturumunun tüm uygulama boyunca yönetilmesini sağlar.
   ======================================================================== */
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api';
import { USER_ROLE } from '@timesheet/shared';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // isBooting: Uygulama ilk açıldığında sunucudan session (/me) kontrolü 
  // yapılana kadar "yükleniyor" ekranı göstermek için kullanılır.
  const [isBooting, setIsBooting] = useState(true);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Sayfa yenilendiğinde Cookie üzerinden mevcut oturumu (/me) geri yüklemeye çalışır
      const response = await authService.getMe();
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch {
      // Oturum yoksa veya süresi dolmuşsa state'leri sıfırla
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      // Kontrol tamamlandı, boot süreci bitti (Splash screen kapanabilir)
      setIsBooting(false);
    }
  };


  const login = async (username, password) => {
    try {
      const response = await authService.login(username, password);

      if (!response || !response.data || !response.data.user) {
        throw new Error('Invalid response structure');
      }

      setUser(response.data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Kullanıcı adı veya şifre yanlış' };
    }
  };

  const register = async (username, password, role, unitId, locationId) => {
    try {
      const response = await authService.register(username, password, role, unitId, locationId);

      if (!response || !response.data || !response.data.user) {
        throw new Error('Invalid response structure');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Kayıt başarısız' };
    }
  };

  const logout = async () => {
    try {
      // Sunucu tarafındaki session cookie'lerini temizle
      await authService.logout();
    } catch {
      // Hata olsa bile (örn: internet kesik) kullanıcının uygulama state'ini sıfırlıyoruz
    }
    setUser(null);
    setIsAuthenticated(false);
  };


  const changePassword = async (oldPassword, newPassword) => {
    try {
      await authService.changePassword(oldPassword, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateProfile = (updatedUser) => {
    setUser({ ...user, ...updatedUser });
  };

  const isAdmin = user?.role === USER_ROLE.ADMIN;
  const isResponsible = user?.role === USER_ROLE.RESPONSIBLE;

  const value = {
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
