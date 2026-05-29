/* ========================================================================
   USE EMPLOYEES
   Çalışan verileri için CRUD hook'u.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type {
  PaginationMeta,
  EmployeeListItem,
  EmployeeType,
  Result,
  EmployeeListQuery,
} from '@timesheet/shared';

import { employeeService } from '../../api';
import { DEFAULT_PAGINATION } from '../../constants/pagination';
import { getErrorMessage } from '../../utils/getErrorMessage';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface UseEmployeesReturn {
  employees: EmployeeListItem[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  fetchEmployees: (params?: EmployeeListQuery) => Promise<Result<{ employees: EmployeeListItem[]; pagination: PaginationMeta }>>;
  addEmployee: (data: EmployeeType) => Promise<Result<{ employee: EmployeeListItem }>>;
  editEmployee: (id: string, data: EmployeeType) => Promise<Result<{ employee: EmployeeListItem }>>;
  removeEmployee: (id: string) => Promise<Result<void>>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useEmployees = (): UseEmployeesReturn => {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (params: EmployeeListQuery = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees(params);
      if (!response.success) {
        const message = response.message ?? 'Çalışanlar getirilirken bir hata oluştu';
        setError(message);
        return { success: false as const, error: message };
      }
      const data = response.data;
      setEmployees(data.employees ?? []);
      setPagination(data.pagination ?? DEFAULT_PAGINATION);
      return { success: true as const, data: { employees: data.employees ?? [], pagination: data.pagination ?? DEFAULT_PAGINATION } };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEmployee = useCallback(async (data: EmployeeType) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.createEmployee(data);
      if (!response.success) {
        const message = response.message ?? 'Çalışan eklenirken bir hata oluştu';
        setError(message);
        return { success: false as const, error: message };
      }
      return { success: true as const, data: { employee: response.data.employee } };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editEmployee = useCallback(async (id: string, data: EmployeeType) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.updateEmployee(id, data);
      if (!response.success) {
        const message = response.message ?? 'Çalışan güncellenirken bir hata oluştu';
        setError(message);
        return { success: false as const, error: message };
      }
      return { success: true as const, data: { employee: response.data.employee } };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeEmployee = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.deleteEmployee(id);
      if (!response.success) {
        const message = response.message ?? 'Çalışan silinemedi';
        setError(message);
        return { success: false as const, error: message };
      }
      return { success: true as const, data: undefined as void };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Bir hata oluştu');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    employees,
    pagination,
    isLoading,
    error,
    fetchEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
  };
};
