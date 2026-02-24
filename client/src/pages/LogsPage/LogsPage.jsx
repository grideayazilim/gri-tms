import { useState } from 'react';
import '../../styles/page-layout.scss';
import '../../styles/inputs.scss';
import './LogsPage.scss';

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (action) => {
    const actionMap = {
      CREATE: { label: 'Oluştur', class: 'create' },
      UPDATE: { label: 'Güncelle', class: 'update' },
      DELETE: { label: 'Sil', class: 'delete' },
      LOGIN: { label: 'Giriş', class: 'login' },
      LOGOUT: { label: 'Çıkış', class: 'logout' },
    };
    return actionMap[action] || { label: action, class: 'default' };
  };

  const getEntityTypeLabel = (entityType) => {
    const typeMap = {
      USER: 'Kullanıcı',
      EMPLOYEE: 'Çalışan',
      TIMESHEET: 'Puantaj',
      LOCATION: 'Yerleşke',
      UNIT: 'Birim',
      ANNOUNCEMENT: 'Duyuru',
      SETTINGS: 'Ayarlar',
    };
    return typeMap[entityType] || entityType;
  };

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Sistem Logları</h1>
      </div>

      {/* Filters */}
      <div className="filter-area">
        <div className="floating-group floating-group--on-background">
          <select
            className="input"
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
          >
            <option value="">Tüm İşlemler</option>
            <option value="CREATE">Oluştur</option>
            <option value="UPDATE">Güncelle</option>
            <option value="DELETE">Sil</option>
            <option value="LOGIN">Giriş</option>
            <option value="LOGOUT">Çıkış</option>
          </select>
          <label className="floating-group__label">İşlem Tipi</label>
        </div>

        <div className="floating-group floating-group--on-background">
          <select
            className="input"
            value={filters.entityType}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
          >
            <option value="">Tüm Varlıklar</option>
            <option value="USER">Kullanıcı</option>
            <option value="EMPLOYEE">Çalışan</option>
            <option value="TIMESHEET">Puantaj</option>
            <option value="LOCATION">Yerleşke</option>
            <option value="UNIT">Birim</option>
            <option value="ANNOUNCEMENT">Duyuru</option>
            <option value="SETTINGS">Ayarlar</option>
          </select>
          <label className="floating-group__label">Varlık Tipi</label>
        </div>

        <div className="floating-group floating-group--on-background">
          <input
            type="text"
            className="input"
            placeholder=" "
            value={filters.username}
            onChange={(e) => handleFilterChange('username', e.target.value)}
          />
          <label className="floating-group__label">Kullanıcı Adı</label>
        </div>
      </div>

      {/* Logs List */}
      <div className="logs-list">
        {filteredLogs.length === 0 ? (
          <div className="page-section">
            <div className="empty-state">
              <div className="empty-state__icon">📋</div>
              <div className="empty-state__title">Log bulunamadı</div>
              <div className="empty-state__description">
                Filtreleri değiştirerek tekrar deneyin
              </div>
            </div>
          </div>
        ) : (
          filteredLogs.map(log => {
            const actionInfo = getActionBadge(log.action);
            return (
              <div key={log.id} className="log-card">
                <div className="log-card__header">
                  <div className="log-card__badges">
                    <span className={`badge badge--${actionInfo.class}`}>
                      {actionInfo.label}
                    </span>
                    <span className="badge badge--entity">
                      {getEntityTypeLabel(log.entityType)}
                    </span>
                  </div>
                  <span className="log-card__time">{formatDate(log.createdAt)}</span>
                </div>
                
                <div className="log-card__body">
                  <div className="log-card__user">
                    <strong>{log.actorUsername}</strong>
                  </div>
                  
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="log-card__metadata">
                      {Object.entries(log.metadata).map(([key, value]) => (
                        <div key={key} className="metadata-item">
                          <span className="metadata-item__key">{key}:</span>
                          <span className="metadata-item__value">
                            {typeof value === 'object' ? JSON.stringify(value) : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};

export default LogsPage;

