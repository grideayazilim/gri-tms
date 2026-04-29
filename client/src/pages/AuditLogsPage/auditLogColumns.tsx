import { getAuditActionCategoryConfig, getAuditActionMeta } from '@timesheet/shared';
import PopUpColumn from './PopUpColumn/PopUpColumn';
import Pill from '../../components/Pill/Pill';
import { formatDate } from '../../utils/dateUtils';
import type { AuditLogItem } from '@timesheet/shared';
import type { Column } from '../../components/DynamicTable/DynamicTable';

export const auditLogColumns: Column<AuditLogItem>[] = [
  {
    header: 'İşlem Tipi',
    render: (row) => {
      const cfg = getAuditActionCategoryConfig(row.action);
      const actionLabel = getAuditActionMeta(row.action).label;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Pill cfg={cfg} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{actionLabel}</span>
        </span>
      );
    },
  },
  {
    header: 'İşlemi Yapan',
    render: (row) => {
      // Not: API'den dönen tipte `actorUsername` var. Mevcut kodda `row.actor?.username` deniyordu. 
      // Bunu Domain Tipine (AuditLogItem) uygun şekilde düzeltiyoruz.
      const username = row.actorUsername || '-';
      const role = row.actorRole || 'Sistem';
      return (
        <span>
          <strong>{username}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>
            ({role})
          </span>
        </span>
      );
    },
  },
  {
    header: 'İşlem Özeti',
    render: (row) => {
      const summary = row.summary || '-';
      const hasDetails =
        (Array.isArray(row.changes) && row.changes.length > 0) ||
        (row.metadata && Object.keys(row.metadata).length > 0);

      if (!hasDetails) return <span>{summary}</span>;

      return (
        <PopUpColumn
          trigger={summary}
          changes={row.changes || []}
          metadata={row.metadata || {}}
          // Not: API'den gelen `entityId` var `entityLabel` yok. TypeScript hatasını 
          // engellemek için tipi opsiyonel string yapıyoruz
          entityLabel={(row as any).entityLabel}
        />
      );
    },
  },
  {
    header: 'İşlem Tarihi',
    render: (row) => formatDate(row.createdAt, 'dd.MM.yyyy HH:mm'),
  },
];
