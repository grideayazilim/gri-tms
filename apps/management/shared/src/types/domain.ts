/* ========================================================================
   DOMAIN DTO TİP TANIMLARI
   Server response'larından dönen domain veri şekilleri.
   Hem client hem server bu tipleri kullanır (JSON-safe, camelCase).
   ======================================================================== */

import type { UserRole, UserStatus } from '../constants/userConstants';
import type { AuditAction, AuditEntityType } from '../constants/auditEventTypes';
import type { MarkerCode } from '../constants/markers';

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
  // Not: DB'de nullable olduğundan DTO'da da nullable. employeeSchema'da required —
  // schema yeni kayıt için zorlarken DTO mevcut DB verisini yansıtır.
  tcNo: string | null;
  firstName: string;
  lastName: string;
  startDate: string | null;
  endDate: string | null;
  ibanNo: string | null;
  phoneNo: string | null;
  isActive: boolean;
  createdAt: string;
  unit: UnitWithLocation | null;
}

// ─── Timesheet ────────────────────────────────────────────────────────────────

export interface TimesheetDay {
  day: string;
  // plain string yerine MarkerCode union tipi — tip güvenliği uygulama genelinde korunur
  markerCode: MarkerCode;
}

export interface TimesheetEntry {
  id: string | null;
  employeeId: string;
  periodId: string;
  days: TimesheetDay[];
}

export interface TimesheetListItem {
  // EmployeeListItem'ın ilgili alanları Pick ile alındı — bağımsız drift riski azaltıldı
  employee: Pick<
    EmployeeListItem,
    'id' | 'tcNo' | 'firstName' | 'lastName' | 'ibanNo' | 'isActive' | 'startDate' | 'endDate'
  >;
  unit: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  period?: { isLocked: boolean; lockReason?: PeriodLockReason };
  totalWorkDays?: number;
  timesheet: {
    id: string | null;
    periodId: string;
    days: TimesheetDay[];
  };
}

/** Kilidi kim koydu — AUTO (gece cron'u) veya MANUAL (yönetici). */
export type PeriodLockReason = 'AUTO' | 'MANUAL';

export interface PeriodItem {
  id: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  /** MANUAL kilitleri gece cron'u açmaz; arayüz bunu göstermelidir. */
  lockReason?: PeriodLockReason;
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
  // plain string yerine UserRole union tipi + SYSTEM sabit aktörü
  actorRole: UserRole | 'SYSTEM' | null;
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
  successes?: Array<{ row: number; name: string }>;
  failures: Array<{ row: number; name: string; error: string }>;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface ExportParams {
  locationId: string;
  year: number;
  month: number;
  locationName: string;
}
