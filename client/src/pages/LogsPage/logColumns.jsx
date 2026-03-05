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

export const logColumns = [
    {
        header: 'İşlem Tipi',
        render: (row) => {
            const badge = ACTION_BADGE_MAP[row.action] || { label: row.action, cls: 'default' };
            const label = AUDIT_EVENTS[row.action]?.label ?? badge.label;
            return <span className={`badge badge--${badge.cls}`}>{label}</span>;
        },
    },
    {
        header: 'İşlemi Yapan',
        render: (row) => {
             const roleLabel = USER_ROLES[row.actorRole]?.label || row.actorRole;
             return (
                 <span>
                     <strong>{row.actorName || row.actorUsername}</strong> ({roleLabel})
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
            return (
                <PopUpColumn trigger="Görüntüle">
                    {row.metadata != null && (
                        <div className="data-popup__section">
                            <div className="data-popup__label">Metadata</div>
                            <pre className="data-popup__pre">{JSON.stringify(row.metadata, null, 2)}</pre>
                        </div>
                    )}
                    {row.oldData != null && (
                        <div className="data-popup__section">
                            <div className="data-popup__label">Eski Değer</div>
                            <pre className="data-popup__pre">{JSON.stringify(row.oldData, null, 2)}</pre>
                        </div>
                    )}
                    {row.newData != null && (
                        <div className="data-popup__section">
                            <div className="data-popup__label">Yeni Değer</div>
                            <pre className="data-popup__pre">{JSON.stringify(row.newData, null, 2)}</pre>
                        </div>
                    )}
                </PopUpColumn>
            );
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
