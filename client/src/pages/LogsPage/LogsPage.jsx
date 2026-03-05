import { useState } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { logColumns } from './logColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useFilter } from '../../hooks/data/useFilter';
import { logFilterConfig } from './logFilters';
import '../../styles/inputs.scss';

const LogsPage = () => {
  const [logs, setLogs] = useState([
    {
      id: 1,
      actorUsername: 'admin_user',
      action: 'CREATE',
      entityType: 'EMPLOYEE',
      entityId: 'uuid-123',
      metadata: { employeeName: 'Ali Yılmaz', tcNo: '12345678901' },
      createdAt: '2024-02-20T09:15:30Z',
    },
    {
      id: 2,
      actorUsername: 'responsible_user',
      action: 'UPDATE',
      entityType: 'TIMESHEET',
      entityId: 'uuid-456',
      metadata: { daysModified: 5, employeeName: 'Ayşe Demir' },
      createdAt: '2024-02-20T09:10:15Z',
    },
    {
      id: 3,
      actorUsername: 'admin_user',
      action: 'DELETE',
      entityType: 'USER',
      entityId: 'uuid-789',
      metadata: { deletedUsername: 'old_user' },
      createdAt: '2024-02-20T09:05:00Z',
    },
    {
      id: 4,
      actorUsername: 'responsible_user',
      action: 'LOGIN',
      entityType: 'USER',
      entityId: 'uuid-user',
      metadata: { ipAddress: '192.168.1.100' },
      createdAt: '2024-02-20T09:00:00Z',
    },
  ]);

  const { filteredData: filteredLogs, filters, handleFilterChange } = useFilter(logs, logFilterConfig, {
    action: '',
    beforeDate: new Date().toISOString().split('T')[0], // Default today
    searchActor: '',
  });

  return (
    <PageShell title="Sistem Logları">
      {/* Filters */}
      <FilterBar config={logFilterConfig} filters={filters} onFilterChange={handleFilterChange} />

      {/* Logs List */}
      <DynamicTable
        columns={logColumns}
        data={filteredLogs}
        pageSize={10}
      />
    </PageShell>
  );
};

export default LogsPage;

