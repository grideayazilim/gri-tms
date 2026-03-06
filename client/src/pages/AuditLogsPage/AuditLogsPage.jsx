import { useState, useEffect } from 'react';
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
  const { auditLogs, fetchAuditLogs, isLoading, error } = useAuditLogs();

  const { filters, apiParams, handleFilterChange } = useFilter(auditLogFilterConfig, {
    action: '',
    beforeDate: '', // Ön tanımlı olarak tüm zamanları getir
    searchActor: '',
  });

  useEffect(() => {
    fetchAuditLogs(apiParams);
  }, [fetchAuditLogs, apiParams]); 

  return (
    <PageShell title="İşlem Kayıtları" isLoading={isLoading}>
      {/* Filters */}
      <FilterBar config={auditLogFilterConfig} filters={filters} onFilterChange={handleFilterChange} />

      {/* Logs List */}
      {error && <div className="error-message">{error}</div>}
      <DynamicTable
        columns={auditLogColumns}
        data={auditLogs}
        pageSize={10}
      />
    </PageShell>
  );
};

export default AuditLogsPage;

