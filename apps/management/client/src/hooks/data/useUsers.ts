/* ========================================================================
   USE USERS
   Kullanıcı verileri için CRUD hook'u.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type {
  PaginationMeta,
  UserListItem,
  UserEditType,
  ProfileUpdateType,
  Result,
  UserListQuery,
} from '@timesheet/shared';

import { userService } from '../../api';
import { DEFAULT_PAGINATION } from '../../constants/pagination';
import { getErrorMessage } from '../../utils/getErrorMessage';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface UseUsersReturn {
  users: UserListItem[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  fetchUsers: (params?: UserListQuery) => Promise<Result<{ users: UserListItem[]; pagination: PaginationMeta }>>;
  editUser: (userId: string, data: UserEditType) => Promise<Result<{ user: UserListItem }>>;
  removeUser: (userId: string) => Promise<Result<void>>;
  editProfile: (data: ProfileUpdateType) => Promise<Result<{ user: UserListItem; message?: string }>>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params: UserListQuery = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getUsers(params);
      if (!response.success) {
        const message = response.message ?? 'Kullanıcılar getirilirken bir hata oluştu';
        setError(message);
        return { success: false as const, error: message };
      }
      const data = response.data;
      setUsers(data.users ?? []);
      setPagination(data.pagination ?? DEFAULT_PAGINATION);
      return { success: true as const, data: { users: data.users ?? [], pagination: data.pagination ?? DEFAULT_PAGINATION } };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Kullanıcılar getirilirken bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editUser = useCallback(async (userId: string, data: UserEditType) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.updateUser(userId, data);
      if (!response.success) {
        const message = response.message ?? 'Kullanıcı güncellenirken bir hata oluştu';
        setError(message);
        return { success: false as const, error: message };
      }
      return { success: true as const, data: { user: response.data } };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Kullanıcı güncellenirken bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeUser = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.deleteUser(userId);
      if (!response.success) {
        const message = response.message ?? 'Kullanıcı silinemedi';
        setError(message);
        return { success: false as const, error: message };
      }
      return { success: true as const, data: undefined as void };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Kullanıcı silinirken bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editProfile = useCallback(async (data: ProfileUpdateType) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.updateProfile(data);
      if (!response.success) {
        const message = response.message ?? 'Profil güncellenirken bir hata oluştu';
        setError(message);
        return { success: false as const, error: message };
      }
      return { success: true as const, data: { user: response.data, message: response.message ?? '' } };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Profil güncellenirken bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    users,
    pagination,
    isLoading,
    error,
    fetchUsers,
    editUser,
    removeUser,
    editProfile,
  };
};
