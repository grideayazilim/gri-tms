/* ========================================================================
   USE USERS
   Kullanıcı verileri için CRUD hook'u.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type { PaginationMeta, UserListItem, UserEditType, ProfileUpdateType, Result } from '@timesheet/shared';

import { userService } from '../../api';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface UserListQuery {
  role?: string;
  status?: string;
  unitId?: string;
  locationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

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

const DEFAULT_PAGINATION: PaginationMeta = {
  totalRecords: 0,
  currentPage: 1,
  limit: 10,
  totalPages: 0,
};

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params: UserListQuery = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getUsers(params);
      const data = (response as { data?: { users?: UserListItem[]; pagination?: PaginationMeta } }).data;
      setUsers(data?.users ?? []);
      setPagination(data?.pagination ?? DEFAULT_PAGINATION);
      return { success: true as const, data: { users: data?.users ?? [], pagination: data?.pagination ?? DEFAULT_PAGINATION } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Kullanıcılar getirilirken bir hata oluştu';
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
      const respData = response as { data?: UserListItem };
      return { success: true as const, data: { user: respData.data as UserListItem } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Kullanıcı güncellenirken bir hata oluştu';
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
      return { success: true as const, data: undefined as void, message: (response as { message?: string }).message };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Kullanıcı silinirken bir hata oluştu';
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
      const respData = response as { data?: UserListItem; message?: string };
      return { success: true as const, data: { user: respData.data as UserListItem, message: respData.message ?? '' } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Profil güncellenirken bir hata oluştu';
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
