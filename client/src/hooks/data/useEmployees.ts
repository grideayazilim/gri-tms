/* ========================================================================
   USE EMPLOYEES
   Çalışan verileri için CRUD hook'u.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type { PaginationMeta, EmployeeListItem, EmployeeType, Result } from '@timesheet/shared';

import { employeeService } from '../../api';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface EmployeeListQuery {
  locationId?: string;
  unitId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

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

const DEFAULT_PAGINATION: PaginationMeta = {
  totalRecords: 0,
  currentPage: 1,
  limit: 10,
  totalPages: 0,
};

export const useEmployees = (): UseEmployeesReturn => {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async (params: EmployeeListQuery = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees(params);
      const data = (response as { data?: { employees?: EmployeeListItem[]; pagination?: PaginationMeta } }).data;
      setEmployees(data?.employees ?? []);
      setPagination(data?.pagination ?? DEFAULT_PAGINATION);
      return { success: true as const, data: { employees: data?.employees ?? [], pagination: data?.pagination ?? DEFAULT_PAGINATION } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Bir hata oluştu';
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
      const respData = (response as { data?: { employee?: EmployeeListItem } }).data;
      return { success: true as const, data: { employee: respData?.employee as EmployeeListItem } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Bir hata oluştu';
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
      const respData = (response as { data?: { employee?: EmployeeListItem } }).data;
      return { success: true as const, data: { employee: respData?.employee as EmployeeListItem } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Bir hata oluştu';
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
      await employeeService.deleteEmployee(id);
      return { success: true as const, data: undefined as void };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Bir hata oluştu';
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
