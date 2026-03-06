import { useState, useCallback } from 'react';
import { auditLogService } from '../../api';

export const useAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAuditLogs = useCallback(async (apiParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const finalParams = {
        limit: 100,
        startDate: apiParams.endDate ? '2020-01-01' : undefined,
        ...apiParams
      };

      const response = await auditLogService.getAuditLogs(finalParams);
      if (response && response.data && response.data.auditLogs) {
        setAuditLogs(response.data.auditLogs);
      } else {
        setAuditLogs([]);
      }
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message || 'Audit Loglar alınırken hata oluştu');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    auditLogs,
    isLoading,
    error,
    fetchAuditLogs,
  };
};