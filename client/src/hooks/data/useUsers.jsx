import { useState, useCallback } from "react";
import { userService } from "../../api";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    currentPage: 1,
    limit: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getUsers(params);
      setUsers(response.data?.users || []);
      setPagination(response.data?.pagination || { totalRecords: 0, currentPage: 1, limit: 10, totalPages: 0 });
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message || "Kullanıcılar getirilirken bir hata oluştu");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editUser = useCallback(async (userId, data) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.updateUser(userId, data);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message || "Kullanıcı güncellenirken bir hata oluştu");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeUser = useCallback(async (userId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.deleteUser(userId);
      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message || "Kullanıcı silinirken bir hata oluştu");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editProfile = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.updateProfile(data);
      return { success: true, data: response.data, message: response.message };
    } catch (err) {
      setError(err.message || "Profil güncellenirken bir hata oluştu");
      return { success: false, error: err.message };
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
