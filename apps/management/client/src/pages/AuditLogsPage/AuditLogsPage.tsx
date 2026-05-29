import { useState, useEffect, useCallback } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { auditLogColumns } from './auditLogColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useFilter } from '../../hooks/data/useFilter';
import { auditLogFilterConfig } from './auditLogFilters';
import { useAuditLogs } from '../../hooks/data/useAuditLogs';
import '../../styles/inputs.scss';
import './AuditLogsPage.scss';

const AuditLogsPage = () => {
  const { auditLogs, pagination, fetchAuditLogs, isLoading, error } = useAuditLogs();

  const [page, setPage] = useState(1);

  const { filters, apiParams, handleFilterChange } = useFilter(auditLogFilterConfig, {
    category: '',
    beforeDate: '',
    searchActor: '',
  });

  const handleFilterChangeAndReset = useCallback((key: string, value: string) => {
    handleFilterChange(key, value);
    setPage(1);
  }, [handleFilterChange]);

  useEffect(() => {
    // Sayfa numarası veya filtreler değiştiğinde logları sunucudan çeker
    fetchAuditLogs(apiParams, page);
  }, [fetchAuditLogs, apiParams, page]);

  return (
    <PageShell title="İşlem Kayıtları">
      <FilterBar config={auditLogFilterConfig} filters={filters} onFilterChange={handleFilterChangeAndReset} />
      {error && <div className="error-message">{error}</div>}
      <DynamicTable
        columns={auditLogColumns}
        data={auditLogs}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />
    </PageShell>
  );
};

export default AuditLogsPage;
