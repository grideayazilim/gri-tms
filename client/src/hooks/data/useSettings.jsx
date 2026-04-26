import { useState, useCallback } from 'react';
import { settingsService } from '../../api';

export const useSettings = () => {
  // States for Pending Users
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isPendingUsersLoading, setIsPendingUsersLoading] = useState(false);

  // States for System Settings
  const [systemSettings, setSystemSettings] = useState(null);
  const [isSystemSettingsLoading, setIsSystemSettingsLoading] = useState(false);

  const [error, setError] = useState(null);

  // --- FETCHING ---

  const fetchPendingUsers = useCallback(async () => {
    setIsPendingUsersLoading(true);
    setError(null);
    try {
      const response = await settingsService.getPendingUsers();
      if (response && response.data && response.data.users) {
        // Bekleyen kullanıcıları yerel state'e kaydet
        setPendingUsers(response.data.users);
      }
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message || 'Onay bekleyen kullanıcılar alınırken hata oluştu');
      return { success: false, error: err.message };
    } finally {
      setIsPendingUsersLoading(false);
    }
  }, []);


  const fetchSystemSettings = useCallback(async () => {
    setIsSystemSettingsLoading(true);
    setError(null);
    try {
      const response = await settingsService.getSystemSettings();
      if (response && response.data && response.data.settings) {
        setSystemSettings(response.data.settings);
      }
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message || 'Sistem ayarları alınırken hata oluştu');
      return { success: false, error: err.message };
    } finally {
      setIsSystemSettingsLoading(false);
    }
  }, []);

  // --- MUTATIONS ---

  const approveUser = async (id) => {
    try {
      const response = await settingsService.approvePendingUser(id);
      // Başarılı onay sonrası kullanıcıyı listeden anlık olarak çıkar (Optimistik UI)
      setPendingUsers(prev => prev.filter(user => user.id !== id));
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message || 'Kullanıcı onaylanamadı' };
    }
  };


  const rejectUser = async (id) => {
    try {
      const response = await settingsService.rejectPendingUser(id);
      // Remove from list
      setPendingUsers(prev => prev.filter(user => user.id !== id));
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message || 'Kullanıcı reddedilemedi' };
    }
  };

  const updateSystemSettings = async (data) => {
    try {
      const response = await settingsService.updateSystemSettings(data);
      // Güncelleme sonrası yeni ayarları sunucudan tekrar çek
      await fetchSystemSettings();
      return { success: true, data: response.data };
    } catch (err) {
       // Çakışma Kontrolü (Conflict): Eğer tarih değişimi varsa sunucu 409 döner.
       // Bu durumda kullanıcıya modal ile onay sorulması için özel hata kodu (CONFIRM_PERIOD_CHANGE) döndürüyoruz.
       if (err.status === 409) {
         return { success: false, code: 'CONFIRM_PERIOD_CHANGE', error: err.message || 'Tarih değişimi için onay gerekli' };
       }
       return { success: false, error: err.message || 'Sistem ayarları güncellenemedi' };
    }
  };


  return {
    // States
    pendingUsers,
    isPendingUsersLoading,
    systemSettings,
    isSystemSettingsLoading,
    error,

    // Fetch methods
    fetchPendingUsers,
    fetchSystemSettings,

    // Mutation methods
    approveUser,
    rejectUser,
    updateSystemSettings,
  };
};
