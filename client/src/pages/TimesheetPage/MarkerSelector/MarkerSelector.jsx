import React from 'react';
import './MarkerSelector.scss';

// isPaid: backend'de her marker için DB'de tutulan flag — burası mock, gerçekte API'den gelir
export const MARKERS = [
    { code: 'X',  label: 'X',  title: 'Çalışıldı',    isPaid: true  },
    { code: 'R',  label: 'R',  title: 'Resmi Tatil',   isPaid: false },
    { code: 'I',  label: 'İ',  title: 'İzin',          isPaid: false },
    { code: 'RT', label: 'RT', title: 'Raporlu Tatil', isPaid: true  },
    { code: 'DT', label: 'DT', title: 'Devlet Tatili', isPaid: false },
];

/**
 * Puantaj işaretçi seçici.
 * Aktif/pasif kontrolü tamamen dışarıdan gelir.
 */
const MarkerSelector = ({ selected, onSelect }) => {
    return (
        <div className="marker-selector">
            <span className="marker-selector__label">İşaretçi:</span>
            <div className="marker-selector__buttons">
                {MARKERS.map((m) => (
                    <button
                        key={m.code}
                        type="button"
                        title={m.title}
                        className={`marker-btn${selected === m.code ? ' marker-btn--active' : ''}`}
                        onClick={() => onSelect(m.code)}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MarkerSelector;
