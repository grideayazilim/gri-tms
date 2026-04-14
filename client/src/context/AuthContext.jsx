import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Uygulama başlangıcında auth kontrolü yap
  useEffect(() => {
    checkAuth();
  }, []);

  // /me endpoint'i ile authentication kontrolü
  const checkAuth = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      // Authenticated değil - cookie'ler geçersiz veya expired
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const response = await authService.login(username, password);
      console.log('🔍 Login response:', response);
      
      if (!response || !response.data || !response.data.user) {
        throw new Error('Invalid response structure');
      }
      
      const { user: userData } = response.data;

      // Cookie'ler backend tarafından otomatik set edildi
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error.message || 'Kullanıcı adı veya şifre yanlış';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Register
  const register = async (username, password, role, unitId, locationId) => {
    setIsLoading(true);
    try {
      const response = await authService.register(username, password, role, unitId, locationId);
      console.log('🔍 Register response:', response);
      
      if (!response || !response.data || !response.data.user) {
        throw new Error('Invalid response structure');
      }
      
      // Kayıt başarılı oldu, onay bekliyor. Otomatik login yapılmaz.
      return { success: true };
    } catch (error) {
      console.error('❌ Register error:', error);
      const errorMessage = error.message || 'Kayıt başarısız';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authService.logout();
      // Cookie'ler backend tarafından temizlendi
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setIsAuthenticated(false);
  };

  // Şifre değiştir
  const changePassword = async (oldPassword, newPassword) => {
    setIsLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Kullanıcı bilgilerini güncelle
  const updateProfile = (updatedUser) => {
    setUser({ ...user, ...updatedUser });
  };

  // Rol kontrolleri
  const isAdmin = () => user?.role === 'ADMIN';
  const isResponsible = () => user?.role === 'RESPONSIBLE';

  const value = {
    user,
    isLoading,
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
