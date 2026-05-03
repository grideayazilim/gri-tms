/* ========================================================================
   DOMAIN DTO TİP TANIMLARI
   Server response'larından dönen domain veri şekilleri.
   Hem client hem server bu tipleri kullanır (JSON-safe, camelCase).
   ======================================================================== */

import type { UserRole, UserStatus } from '../constants/userConstants';
import type { AuditAction, AuditEntityType } from '../constants/auditEventTypes';

// ─── Location & Unit ──────────────────────────────────────────────────────────

export interface LocationItem {
  id: string;
  name: string;
  programNo: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitItem {
  id: string;
  name: string;
  locationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitWithLocation {
  id: string;
  name: string;
  location: { id: string; name: string } | null;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserUnitInfo {
  id: string | null;
  name: string | null;
  location: { id: string; name: string } | null;
}

export interface UserListItem {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  expiryDate: string | null;
  createdAt: string;
  unit: UserUnitInfo | null;
}

export type PendingUserItem = Omit<UserListItem, 'expiryDate'>;

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeListItem {
  id: string;
  tcNo: string | null;
  firstName: string;
  lastName: string;
  startDate: string | null;
  endDate: string | null;
  ibanNo: string | null;
  isActive: boolean;
  createdAt: string;
  unit: UnitWithLocation | null;
}

// ─── Timesheet ────────────────────────────────────────────────────────────────

export interface TimesheetDay {
  day: string;
  markerCode: string;
}

export interface TimesheetEntry {
  id: string | null;
  employeeId: string;
  periodId: string;
  days: TimesheetDay[];
}

export interface TimesheetListItem {
  employee: {
    id: string;
    tcNo: string | null;
    firstName: string;
    lastName: string;
    ibanNo: string | null;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
  };
  unit: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  period?: { isLocked: boolean };
  totalWorkDays?: number;
  timesheet: {
    id: string | null;
    periodId: string;
    days: TimesheetDay[];
  };
}

export interface PeriodItem {
  id: string;
  year: number;
  month: number;
  isLocked: boolean;
  isDeleted: boolean;
  createdAt: string;
}

// ─── Announcement ─────────────────────────────────────────────────────────────

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogItem {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  entityLabel?: string;
  actorUsername: string;
  actorRole: string | null;
  summary: string | null;
  changes: string[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SystemSettings {
  id: string;
  dailyWage: number | null;
  maxWeeklyDays: number | null;
  programStartDate: string | null;
  programEndDate: string | null;
}

// ─── Holiday ──────────────────────────────────────────────────────────────────

export interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  action: 'created' | 'skipped';
  employee: { id: string; firstName: string; lastName: string };
}

export interface BulkImportResult {
  successCount: number;
  failures: Array<{ row: number; name: string; error: string }>;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface ExportParams {
  locationId: string;
  year: number;
  month: number;
  locationName: string;
}
