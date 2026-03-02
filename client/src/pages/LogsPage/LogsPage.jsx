import { useState } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { logColumns } from './logColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import '../../styles/page-layout.scss';
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

  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    username: '',
  });

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const filteredLogs = logs.filter(log => {
    if (filters.action && log.action !== filters.action) return false;
    if (filters.entityType && log.entityType !== filters.entityType) return false;
    if (filters.username && !log.actorUsername.toLowerCase().includes(filters.username.toLowerCase())) return false;
    return true;
  });

  const filterConfig = [
    { 
      key: 'action', 
      label: 'İşlem Tipi', 
      type: 'select', 
      options: [
        { value: 'CREATE', label: 'Oluştur' }, 
        { value: 'UPDATE', label: 'Güncelle' },
        { value: 'DELETE', label: 'Sil' },
        { value: 'LOGIN', label: 'Giriş' },
        { value: 'LOGOUT', label: 'Çıkış' }
      ], 
      defaultOption: 'Tüm İşlemler' 
    },
    { 
      key: 'entityType', 
      label: 'Varlık Tipi', 
      type: 'select', 
      options: [
        { value: 'USER', label: 'Kullanıcı' }, 
        { value: 'EMPLOYEE', label: 'Çalışan' },
        { value: 'TIMESHEET', label: 'Puantaj' },
        { value: 'LOCATION', label: 'Yerleşke' },
        { value: 'UNIT', label: 'Birim' },
        { value: 'ANNOUNCEMENT', label: 'Duyuru' },
        { value: 'SETTINGS', label: 'Ayarlar' }
      ], 
      defaultOption: 'Tüm Varlıklar' 
    },
    { key: 'username', label: 'Kullanıcı Adı', type: 'text' },
  ];

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Sistem Logları</h1>
      </div>

      {/* Filters */}
      <FilterBar config={filterConfig} filters={filters} onFilterChange={handleFilterChange} />

      {/* Logs List */}
      <DynamicTable
        columns={logColumns}
        data={filteredLogs}
        pageSize={10}
      />
    </main>
  );
};

export default LogsPage;

