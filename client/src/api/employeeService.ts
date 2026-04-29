/* ========================================================================
   EMPLOYEE SERVICE (ÇALIŞAN SERVİSİ)
   Çalışan kartları oluşturma, güncelleme ve listeleme.
   ======================================================================== */
import type { ApiResponse, PaginationMeta, EmployeeListItem, EmployeeType } from '@timesheet/shared';

import { api } from './httpClient';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface EmployeeListQuery {
  locationId?: string;
  unitId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface EmployeeListData {
  employees: EmployeeListItem[];
  pagination: PaginationMeta;
}

interface EmployeeSingleData {
  employee: EmployeeListItem;
}

// ─── Servis ───────────────────────────────────────────────────────────────────

// Çalışanları getir (filtreleme + sayfalama)
export const getEmployees = (params: EmployeeListQuery = {}) =>
  api.get<ApiResponse<EmployeeListData>>('/employees', { params });

// Yeni çalışan ekle
export const createEmployee = (data: EmployeeType) =>
  api.post<ApiResponse<EmployeeSingleData>>('/employees', data);

// Çalışan güncelle
export const updateEmployee = (employeeId: string, data: EmployeeType) =>
  api.put<ApiResponse<EmployeeSingleData>>(`/employees/${employeeId}`, data);

// Çalışan sil
export const deleteEmployee = (employeeId: string) =>
  api.delete<ApiResponse<Record<string, never>>>(`/employees/${employeeId}`);
