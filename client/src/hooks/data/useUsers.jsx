import { useState, useCallback } from "react";
import {
  getUsers,
  updateUser,
  deleteUser,
  updateProfile,
} from "../../api/userService";

export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getUsers(params);
      console.log("USERS API RESPONSE:", response);

      if (response.success) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
        return { success: true, data: response.data };
      }
      return { success: false, error: "Sunucudan başarısız yanıt döndü" };
    } catch (err) {
      console.log("ERROR:", err);
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
      const response = await updateUser(userId, data);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: "Güncelleme başarısız" };
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
      const response = await deleteUser(userId);
      if (response.success) {
        return { success: true, message: response.message };
      }
      return { success: false, error: "Silme işlemi başarısız" };
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
      const response = await updateProfile(data);
      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: response.message,
        };
      }
      return { success: false, error: "Profil güncellenemedi" };
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
