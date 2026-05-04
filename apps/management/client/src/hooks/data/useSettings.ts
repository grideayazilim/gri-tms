import { useState, useCallback } from 'react';

import type { PendingUserItem, Result, SystemSettings, SystemSettingsType } from '@timesheet/shared';

import { settingsService } from '../../api';
import { getErrorMessage } from '../../utils/getErrorMessage';

export interface UseSettingsReturn {
  pendingUsers: PendingUserItem[];
  isPendingUsersLoading: boolean;
  systemSettings: SystemSettings | null;
  isSystemSettingsLoading: boolean;
  error: string | null;
  fetchPendingUsers: () => Promise<Result<{ pendingUsers: PendingUserItem[] }>>;
  fetchSystemSettings: () => Promise<Result<{ settings: SystemSettings }>>;
  approveUser: (id: string) => Promise<Result<Record<string, never>>>;
  rejectUser: (id: string) => Promise<Result<Record<string, never>>>;
  updateSystemSettings: (data: SystemSettingsType & { force?: boolean }) => Promise<Result<{ settings: SystemSettings }>>;
  // NOT: editProfile aslında useUsers hook'unda ele alınacak. SettingsPage refactor 
  // edilirken useUsers'dan çağrılması sağlanıp buradan silinecek (Envanter H maddesi).
  // Şimdilik SettingsPage.jsx kırılmasın diye dummy veya fallback eklenebilir,
  // ancak doküman "sadece settings + pending users döner" diyor. Bu yüzden çıkarıldı.
}

export const useSettings = (): UseSettingsReturn => {
  // States for Pending Users
  const [pendingUsers, setPendingUsers] = useState<PendingUserItem[]>([]);
  const [isPendingUsersLoading, setIsPendingUsersLoading] = useState(false);

  // States for System Settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isSystemSettingsLoading, setIsSystemSettingsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // --- FETCHING ---

  const fetchPendingUsers = useCallback(async (): Promise<Result<{ pendingUsers: PendingUserItem[] }>> => {
    setIsPendingUsersLoading(true);
    setError(null);
    try {
      const response = await settingsService.getPendingUsers();
      if (response.success && response.data?.pendingUsers) {
        // Bekleyen kullanıcıları yerel state'e kaydet
        setPendingUsers(response.data.pendingUsers);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.success ? 'Geçersiz veri' : response.message };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Onay bekleyen kullanıcılar alınırken hata oluştu');
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsPendingUsersLoading(false);
    }
  }, []);

  const fetchSystemSettings = useCallback(async (): Promise<Result<{ settings: SystemSettings }>> => {
    setIsSystemSettingsLoading(true);
    setError(null);
    try {
      const response = await settingsService.getSystemSettings();
      if (response.success && response.data?.settings) {
        setSystemSettings(response.data.settings);
        return { success: true, data: response.data };
      }
      return { success: false, error: response.success ? 'Geçersiz veri' : response.message };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Sistem ayarları alınırken hata oluştu');
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSystemSettingsLoading(false);
    }
  }, []);

  // --- MUTATIONS ---

  const approveUser = async (id: string): Promise<Result<Record<string, never>>> => {
    try {
      const response = await settingsService.approvePendingUser(id);
      if (response.success) {
        // Başarılı onay sonrası kullanıcıyı listeden anlık olarak çıkar (Optimistik UI)
        setPendingUsers(prev => prev.filter(user => user.id !== id));
        return { success: true, data: {} };
      }
      return { success: false, error: response.message || 'Kullanıcı onaylanamadı' };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Kullanıcı onaylanamadı');
      return { success: false, error: message };
    }
  };

  const rejectUser = async (id: string): Promise<Result<Record<string, never>>> => {
    try {
      const response = await settingsService.rejectPendingUser(id);
      if (response.success) {
        // Remove from list
        setPendingUsers(prev => prev.filter(user => user.id !== id));
        return { success: true, data: {} };
      }
      return { success: false, error: response.message || 'Kullanıcı reddedilemedi' };
    } catch (err: unknown) {
       const message = getErrorMessage(err, 'Kullanıcı reddedilemedi');
      return { success: false, error: message };
    }
  };

  const updateSystemSettings = async (data: SystemSettingsType & { force?: boolean }): Promise<Result<{ settings: SystemSettings }>> => {
    try {
      const response = await settingsService.updateSystemSettings(data);
      if (response.success) {
        if (response.data?.settings) {
          setSystemSettings(response.data.settings);
          return { success: true, data: response.data };
        }
        // Sunucu data dönmemişse yeniden çek; state async güncelleneceği için fallback döner
        await fetchSystemSettings();
        return { success: true, data: { settings: systemSettings ?? ({} as SystemSettings) } };
      }
      return { success: false, error: response.message ?? 'Bilinmeyen hata' };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Sistem ayarları güncellenemedi');
      return { success: false, error: message };
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
