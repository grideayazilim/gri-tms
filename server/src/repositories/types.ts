/* ========================================================================
   REPOSITORY TİP TANIMLARI
   Tüm repo'larda kullanılan ortak ve ad-hoc interface'ler burada toplanır.
   Controller'lar ihtiyaç duyduğu tipleri buradan import eder.
   ======================================================================== */
import type { UserRole, UserStatus } from '@timesheet/shared';

// ─── User Repo ──────────────────────────────────────────────────────────────

export interface CreatePendingUserParams {
  readonly username: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly unitId: string | null;
  readonly locationId: string | null;
}

export interface UserListFilters {
  readonly role?: UserRole;
  readonly status?: UserStatus;
  readonly unitId?: string;
  readonly locationId?: string;
  readonly search?: string;
}

export interface UserListRow {
  readonly id: string;
  readonly username: string;
  readonly role: string;
  readonly status: string;
  readonly expiryDate: string | null;
  readonly createdAt: Date;
  readonly unitId: string | null;
  readonly unitName: string | null;
  readonly locationId: string | null;
  readonly locationName: string | null;
}

// ─── Employee Repo ──────────────────────────────────────────────────────────

export interface EmployeeListFilters {
  readonly unitId?: string;
  readonly locationId?: string;
  readonly search?: string;
  readonly status?: 'active' | 'inactive';
}

export interface EmployeeListRow {
  readonly id: string;
  readonly tcNo: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly ibanNo: string | null;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly unitId: string;
  readonly unitName: string;
  readonly locationId: string;
  readonly locationName: string;
}

export interface UnitWithLocation {
  readonly id: string;
  readonly name: string;
  readonly locationId: string;
  readonly locationName: string;
}

// ─── Location Repo ──────────────────────────────────────────────────────────

export interface UnitWithCount {
  readonly id: string;
  readonly locationId: string;
  readonly name: string;
  readonly employeeCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ─── Timesheet Repo ─────────────────────────────────────────────────────────

export interface TimesheetListFilters {
  periodId: string;
  search?: string | undefined;
  unitId?: string | undefined;
  locationId?: string | undefined;
  scope?: { unitId?: string | null; locationId?: string | null } | null | undefined;
  role: string;
  limit: number;
  offset: number;
}

// ─── Audit Log Repo ─────────────────────────────────────────────────────────

export interface AuditLogFilters {
  actor?: string;
  action?: string;
  category?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}
