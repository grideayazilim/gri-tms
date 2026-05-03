/* ========================================================================
   CLIENT TİP FASADI
   @timesheet/shared'tan gelen ortak tiplerin tek noktadan re-export'u.
   Sayfalar ve hook'lar bu dosyadan import eder.
   ======================================================================== */

export type {
  ApiResponse,
  ApiSuccess,
  ApiFailure,
  PaginationMeta,
  Result,
  AuthUser,
  Scope,
  JwtPayload,
} from '@timesheet/shared';

export {
  USER_ROLE,
  USER_STATUS,
  USER_ROLE_LIST,
  USER_STATUS_LIST,
} from '@timesheet/shared';

export type { UserRole, UserStatus } from '@timesheet/shared';

export type {
  LocationItem,
  UnitItem,
  UnitWithLocation,
  UserListItem,
  PendingUserItem,
  EmployeeListItem,
  TimesheetDay,
  TimesheetEntry,
  TimesheetListItem,
  PeriodItem,
  AnnouncementItem,
  AuditLogItem,
  SystemSettings,
  PublicHoliday,
  ImportResult,
  BulkImportResult,
  ExportParams,
} from '@timesheet/shared';
