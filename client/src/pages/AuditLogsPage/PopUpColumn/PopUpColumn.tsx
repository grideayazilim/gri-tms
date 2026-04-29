import { useModal } from '../../../components/Modal';
import './PopUpColumn.scss';

// Metadata anahtarlarını kullanıcı dostu etiketlere çevirir
const METADATA_LABELS: Record<string, string> = {
  role: 'Rol',
  unitId: 'Birim ID',
  unitName: 'Birim',
  locationId: 'Yerleşke ID',
  locationName: 'Yerleşke',
  tcNo: 'TC No',
  periodLabel: 'Dönem',
  periodId: 'Dönem ID',
  employeeCount: 'Çalışan Sayısı',
  totalDaysChanged: 'Değişen Toplam Gün',
  employeesWithDayChanges: 'Gün Değişen Çalışan Sayısı',
  totalAttempted: 'Denenen Toplam',
  successCount: 'Başarılı',
  failureCount: 'Başarısız',
  created: 'Eklenen',
  skipped: 'Atlanan',
  failed: 'Hatalı',
  failedItems: 'Hatalı Satırlar',
  wageUpdated: 'Ücret Güncellendi',
  oldWage: 'Eski Ücret',
  newWage: 'Yeni Ücret',
  exportType: 'Dışa Aktarma Türü',
  year: 'Yıl',
  month: 'Ay',
  deletedUnitsCount: 'Silinen Birim Sayısı',
  expiredCount: 'Süresi Dolan Sayısı',
  usernames: 'Kullanıcılar',
  periodsRegenerated: 'Dönemler Yeniden Oluşturuldu',
};

const formatMetadataValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    if (typeof value[0] === 'object' && value[0] !== null) {
      return (
        <ul className="data-popup__sub-list">
          {value.map((item: Record<string, unknown>, i: number) => (
            <li key={i}>
              {Object.entries(item)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(' | ')}
            </li>
          ))}
        </ul>
      );
    }
    return value.join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

interface PopUpColumnProps {
  trigger?: string;
  changes?: string[];
  metadata?: Record<string, unknown>;
  entityLabel?: string;
}

const PopUpColumn = ({ trigger = 'Görüntüle', changes = [], metadata = {}, entityLabel }: PopUpColumnProps) => {
  const { showModal } = useModal();

  const hasChanges = Array.isArray(changes) && changes.length > 0;
  const metadataEntries =
    metadata && typeof metadata === 'object'
      ? Object.entries(metadata).filter(([, v]) => v !== null && v !== undefined && v !== '')
      : [];
  const hasMetadata = metadataEntries.length > 0;

  const handleClick = () => {
    showModal({
      title: entityLabel ? `Detaylar (${entityLabel})` : 'Detaylar',
      size: 'medium',
      content: (onClose) => (
        <div className="log-details-modal">
          {hasChanges && (
            <div className="data-popup__section">
              <div className="data-popup__label">Değişiklikler</div>
              <ul className="data-popup__list">
                {changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {hasMetadata && (
            <div className="data-popup__section">
              <div className="data-popup__label">Ek Bilgiler</div>
              <dl className="data-popup__meta">
                {metadataEntries.map(([key, value]) => (
                  <div className="data-popup__meta-row" key={key}>
                    <dt>{METADATA_LABELS[key] || key}</dt>
                    <dd>{formatMetadataValue(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {!hasChanges && !hasMetadata && (
            <div className="data-popup__section">
              <div className="data-popup__empty">Ek detay bulunmuyor.</div>
            </div>
          )}

          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <button className="btn btn--secondary" onClick={() => onClose(null)}>
              Kapat
            </button>
          </div>
        </div>
      ),
    });
  };

  return (
    <span className="data-popup-trigger" onClick={handleClick} title="Detayları görüntüle">
      {trigger}
    </span>
  );
};

export default PopUpColumn;
