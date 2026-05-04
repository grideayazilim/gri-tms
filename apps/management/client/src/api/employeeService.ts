/* ========================================================================
   EMPLOYEE SERVICE (ÇALIŞAN SERVİSİ)
   Çalışan kartları oluşturma, güncelleme ve listeleme.
   ======================================================================== */
import type {
  ApiResponse,
  EmployeeType,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeeSingleResponse,
} from '@timesheet/shared';

import { api } from './httpClient';

// ─── Servis ───────────────────────────────────────────────────────────────────

// Çalışanları getir (filtreleme + sayfalama)
export const getEmployees = (params: EmployeeListQuery = {}) =>
  api.get<ApiResponse<EmployeeListResponse>>('/employees', { params });

// Yeni çalışan ekle
export const createEmployee = (data: EmployeeType) =>
  api.post<ApiResponse<EmployeeSingleResponse>>('/employees', data);

// Çalışan güncelle
export const updateEmployee = (employeeId: string, data: EmployeeType) =>
  api.put<ApiResponse<EmployeeSingleResponse>>(`/employees/${employeeId}`, data);

// Çalışan sil
export const deleteEmployee = (employeeId: string) =>
  api.delete<ApiResponse<Record<string, never>>>(`/employees/${employeeId}`);
