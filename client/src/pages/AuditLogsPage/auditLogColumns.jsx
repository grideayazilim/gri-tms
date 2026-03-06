import { AUDIT_EVENTS } from '../../constants/auditEvents';
import { USER_ROLES } from '../../constants/users';
import PopUpColumn from './PopUpColumn/PopUpColumn';

const ACTION_BADGE_MAP = {
    CREATE: { label: 'Oluştur', cls: 'create' },
    UPDATE: { label: 'Güncelle', cls: 'update' },
    DELETE: { label: 'Sil',     cls: 'delete' },
    LOGIN:  { label: 'Giriş',   cls: 'login'  },
    LOGOUT: { label: 'Çıkış',   cls: 'logout' },
};

export const auditLogColumns = [
    {
        header: 'İşlem Tipi',
        render: (row) => {
            const badge = ACTION_BADGE_MAP[row.eventType] || { label: row.eventType, cls: 'default' };
            const label = AUDIT_EVENTS[row.eventType]?.label ?? badge.label;
            return <span className={`badge badge--${badge.cls}`}>{label}</span>;
        },
    },
    {
        header: 'İşlemi Yapan',
        render: (row) => {
             const roleLabel = USER_ROLES[row.userRole]?.label || row.userRole || 'Sistem';
             return (
                 <span>
                     <strong>{row.username}</strong> ({roleLabel})
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
