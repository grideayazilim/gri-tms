import { useState, useCallback } from 'react';
import { auditLogService } from '../../api';

const DEFAULT_LIMIT = 10;

export const useAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: DEFAULT_LIMIT,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAuditLogs = useCallback(async (apiParams = {}, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const finalParams = {
        startDate: '2020-01-01',
        ...apiParams,
        page,
        limit: DEFAULT_LIMIT,
      };
      const response = await auditLogService.getAuditLogs(finalParams);
      setAuditLogs(response?.data?.auditLogs ?? []);
      if (response?.data?.pagination) {
        setPagination(response.data.pagination);
      }
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message || 'İşlem kayıtları alınamadı');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { auditLogs, pagination, isLoading, error, fetchAuditLogs };
};
