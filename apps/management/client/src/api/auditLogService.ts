/* ========================================================================
   AUDIT LOG SERVICE (DENETİM KAYITLARI SERVİSİ)
   İşlem geçmişi listeleme.
   ======================================================================== */
import type { ApiResponse, PaginationMeta, AuditLogItem } from '@timesheet/shared';

import { api } from './httpClient';

// ─── Servis ───────────────────────────────────────────────────────────────────

export const getAuditLogs = (params: Record<string, unknown> = {}) =>
  api.get<ApiResponse<{ auditLogs: AuditLogItem[]; pagination: PaginationMeta }>>('/audit-logs', { params });
