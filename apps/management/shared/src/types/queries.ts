/* ========================================================================
   API QUERY PARAMETER TİP TANIMLARI
   Liste endpoint'lerinin query string parametrelerinin şekilleri.
   Hem frontend service'ler hem backend controller/repo'lar bu tipleri kullanır.
   ======================================================================== */

import type { UserRole, UserStatus } from '../constants/userConstants';
import type { AuditAction, AuditEntityType } from '../constants/auditEventTypes';

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeListQuery {
  locationId?: string;
  unitId?: string;
  status?: 'active' | 'inactive';
  search?: string;
  page?: number;
  limit?: number;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserListQuery {
  role?: UserRole;
  status?: UserStatus;
  unitId?: string;
  locationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Timesheet ────────────────────────────────────────────────────────────────

export interface TimesheetListQuery {
  year: number;
  month: number;
  locationId?: string;
  unitId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogListQuery {
  action?: AuditAction;
  entityType?: AuditEntityType;
  actorUsername?: string;
  search?: string;
  page?: number;
  limit?: number;
}
