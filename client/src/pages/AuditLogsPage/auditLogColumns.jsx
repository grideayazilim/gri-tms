/* ========================================================================
   AUDIT LOG COLUMNS (SİSTEM LOGLARI TABLO SÜTUNLARI)
   Geçmiş işlem kayıtlarının nasıl görüntüleneceğini tanımlar.
   ======================================================================== */
import { getAuditActionCategoryConfig, getAuditActionMeta } from '@timesheet/shared';
import PopUpColumn from './PopUpColumn/PopUpColumn';
import Pill from '../../components/Pill/Pill';
import { formatDate } from '../../utils/dateUtils';


export const auditLogColumns = [
    {
        header: 'İşlem Tipi',
        // İşlemin kategorisine göre (Auth, User, Timesheet vb.) renkli etiket gösterir
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
            const username = row.actor?.username || '-';
            const role = row.actor?.role || 'Sistem';
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
        // İşlemin kısa özetini gösterir; eğer detay (changes/metadata) varsa üzerine 
        // tıklandığında açılan bir PopUp penceresi render eder.
        render: (row) => {
            const summary = row.summary || '-';
            const hasDetails = (Array.isArray(row.changes) && row.changes.length > 0)
                || (row.metadata && Object.keys(row.metadata).length > 0);

            if (!hasDetails) return <span>{summary}</span>;

            return (
                <PopUpColumn trigger={summary} changes={row.changes} metadata={row.metadata} entityLabel={row.entityLabel} />
            );
        },
    },

    {
        header: 'İşlem Tarihi',
        render: (row) => formatDate(row.createdAt, 'dd.MM.yyyy HH:mm'),
    },
];
