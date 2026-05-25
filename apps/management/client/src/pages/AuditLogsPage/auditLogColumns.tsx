import { getAuditActionCategoryConfig, getAuditActionMeta } from '@timesheet/shared';
import PopUpColumn from './PopUpColumn/PopUpColumn';
import Pill from '../../components/DynamicTable/Pill/Pill';
import { formatDate } from '../../utils/dateUtils';
import type { AuditLogItem } from '@timesheet/shared';
import type { Column } from '../../components/DynamicTable/DynamicTable';
import './AuditLogsPage.scss';

export const auditLogColumns: Column<AuditLogItem>[] = [
  {
    header: 'İşlem Tipi',
    render: (row) => {
      const cfg = getAuditActionCategoryConfig(row.action);
      const actionLabel = getAuditActionMeta(row.action).label;
      return (
        <span className="audit-action-type">
          <Pill cfg={cfg} />
          <span className="audit-action-label">{actionLabel}</span>
        </span>
      );
    },
  },
  {
    header: 'İşlemi Yapan',
    render: (row) => {
      const username = row.actorUsername || '-';
      const role = row.actorRole || 'Sistem';
      return (
        <span>
          <strong>{username}</strong>
          <span className="audit-actor-role">({role})</span>
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
          {...(row.entityLabel !== undefined ? { entityLabel: row.entityLabel } : {})}
        />
      );
    },
  },
  {
    header: 'İşlem Tarihi',
    render: (row) => formatDate(row.createdAt, 'dd.MM.yyyy HH:mm'),
  },
];
