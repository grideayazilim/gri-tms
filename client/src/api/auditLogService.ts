/* ========================================================================
   AUDIT LOG SERVICE (DENETİM KAYITLARI SERVİSİ)
   İşlem geçmişi listeleme.
   ======================================================================== */
import type { ApiResponse, PaginationMeta, AuditLogItem } from '@timesheet/shared';

import { api } from './httpClient';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface AuditLogQuery {
  action?: string;
  category?: string;
  entityType?: string;
  searchActor?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── Servis ───────────────────────────────────────────────────────────────────

export const getAuditLogs = (params: AuditLogQuery = {}) =>
  api.get<ApiResponse<{ auditLogs: AuditLogItem[]; pagination: PaginationMeta }>>('/audit-logs', { params });
