/* ========================================================================
   API RESPONSE TİP TANIMLARI
   Endpoint başına dönen `data` payload'larının şekilleri.
   `ApiResponse<T>` zarfının `T` argümanı olarak kullanılır.
   ======================================================================== */

import type { PaginationMeta } from './api';
import type {
  EmployeeListItem,
  UserListItem,
  PendingUserItem,
  TimesheetListItem,
  AnnouncementItem,
  SystemSettings,
  PeriodItem,
  AuditLogItem,
} from './domain';
import type { AuthUser } from './auth';

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeListResponse {
  employees: EmployeeListItem[];
  pagination: PaginationMeta;
}

export interface EmployeeSingleResponse {
  employee: EmployeeListItem;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserListResponse {
  users: UserListItem[];
  pagination: PaginationMeta;
}

export interface UserSingleResponse {
  user: UserListItem;
}

export interface PendingUsersResponse {
  users: PendingUserItem[];
}

// ─── Timesheet ────────────────────────────────────────────────────────────────

export interface TimesheetListResponse {
  timesheets: TimesheetListItem[];
  pagination: PaginationMeta;
}

// ─── Announcement ─────────────────────────────────────────────────────────────

export interface AnnouncementListResponse {
  announcements: AnnouncementItem[];
  pagination: PaginationMeta;
}

export interface AnnouncementSingleResponse {
  announcement: AnnouncementItem;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SystemSettingsResponse {
  settings: SystemSettings;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: AuthUser;
}

// ─── Period ───────────────────────────────────────────────────────────────────

export interface PeriodListResponse {
  periods: PeriodItem[];
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogListResponse {
  auditLogs: AuditLogItem[];
  pagination: PaginationMeta;
}
