/* ========================================================================
   USE AUDIT LOGS
   Denetim kayıtları hook'u.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type { PaginationMeta, AuditLogItem, Result } from '@timesheet/shared';

import { auditLogService } from '../../api';
import { DEFAULT_PAGINATION } from '../../constants/pagination';
import { getErrorMessage } from '../../utils/getErrorMessage';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface UseAuditLogsReturn {
  auditLogs: AuditLogItem[];
  pagination: PaginationMeta;
  isLoading: boolean;
  error: string | null;
  fetchAuditLogs: (apiParams?: Record<string, unknown>, page?: number) => Promise<Result<{ auditLogs: AuditLogItem[]; pagination: PaginationMeta }>>;
}

export const useAuditLogs = (): UseAuditLogsReturn => {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async (apiParams: Record<string, unknown> = {}, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const finalParams: Record<string, unknown> = {
        startDate: '2020-01-01',
        ...apiParams,
        page: String(page),
        limit: String(DEFAULT_PAGINATION.limit),
      };
      const response = await auditLogService.getAuditLogs(finalParams);
      if (!response.success) {
        const message = response.message ?? 'İşlem kayıtları alınamadı';
        setError(message);
        return { success: false as const, error: message };
      }
      const data = response.data;
      setAuditLogs(data.auditLogs ?? []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
      return { success: true as const, data: { auditLogs: data.auditLogs ?? [], pagination: data.pagination ?? DEFAULT_PAGINATION } };
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'İşlem kayıtları alınamadı');
      setError(message);
      return { success: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { auditLogs, pagination, isLoading, error, fetchAuditLogs };
};
