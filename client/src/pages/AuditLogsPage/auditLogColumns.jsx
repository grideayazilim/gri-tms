import { getAuditEventConfig } from '../../constants/auditEvents';
import PopUpColumn from './PopUpColumn/PopUpColumn';

const Pill = ({ cfg }) => (
  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
    {cfg.label}
  </span>
);

export const auditLogColumns = [
    {
        header: 'İşlem Tipi',
        render: (row) => <Pill cfg={getAuditEventConfig(row.eventType)} />,
    },
    {
        header: 'İşlemi Yapan',
        render: (row) => {
             return (
                 <span>
                     <strong>{row.username}</strong>
                     <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "4px" }}>
                       ({row.userRole || 'Sistem'})
                     </span>
                 </span>
             );
        }
    },
    {
        header: 'İşlem Açıklaması',
        render: (row) => <span>{row.description || '-'}</span>,
    },
    {
        header: 'Detaylar / Değişiklik',
        render: (row) => {
            const hasData = row.oldData != null || row.newData != null || row.metadata != null;
            if (!hasData) return <span style={{ color: 'var(--text-faint)' }}>-</span>;
            
            const popupData = {};
            if (row.metadata != null) popupData['Metadata'] = row.metadata;
            if (row.oldData != null) popupData['Eski Değer'] = row.oldData;
            if (row.newData != null) popupData['Yeni Değer'] = row.newData;

            return <PopUpColumn trigger="Görüntüle" data={popupData} />;
        },
    },
    {
        header: 'İşlem Tarihi',
        render: (row) => {
            const date = new Date(row.createdAt);
            return date.toLocaleString('tr-TR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        },
    },
];
