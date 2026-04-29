/* ========================================================================
   USE AUDIT LOGS
   Denetim kayıtları hook'u.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type { PaginationMeta, AuditLogItem, Result } from '@timesheet/shared';

import { auditLogService } from '../../api';

// ─── Tipler ───────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 10;

interface UseAuditLogsReturn {
  auditLogs: AuditLogItem[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  fetchAuditLogs: (apiParams?: Record<string, unknown>, page?: number) => Promise<Result<{ auditLogs: AuditLogItem[]; pagination: PaginationMeta }>>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_PAGINATION: PaginationMeta = {
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,
  limit: DEFAULT_LIMIT,
};

export const useAuditLogs = (): UseAuditLogsReturn => {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async (apiParams: Record<string, unknown> = {}, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const finalParams: Record<string, unknown> = {
        startDate: '2020-01-01',
        ...apiParams,
        page: String(page),
        limit: String(DEFAULT_LIMIT),
      };
      const response = await auditLogService.getAuditLogs(finalParams as Record<string, string>);
      const data = (response as { data?: { auditLogs?: AuditLogItem[]; pagination?: PaginationMeta } }).data;
      setAuditLogs(data?.auditLogs ?? []);
      if (data?.pagination) {
        setPagination(data.pagination);
      }
      return { success: true as const, data: { auditLogs: data?.auditLogs ?? [], pagination: data?.pagination ?? DEFAULT_PAGINATION } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'İşlem kayıtları alınamadı';
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { auditLogs, pagination, isLoading, error, fetchAuditLogs };
};
