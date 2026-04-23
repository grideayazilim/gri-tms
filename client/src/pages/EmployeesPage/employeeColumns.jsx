import React, { useState } from 'react';
import { getEmployeeStatusConfig } from '../../constants/employees';
import { FiEdit2, FiTrash2, FiCopy } from 'react-icons/fi';

const Pill = ({ cfg }) => (
  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
    {cfg.label}
  </span>
);

const IbanCell = ({ iban }) => {
    const [tooltipState, setTooltipState] = useState({ show: false, text: iban, x: 0, y: 0, closing: false });

    const handleMouseEnter = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipState({ show: true, text: iban, x: rect.left + rect.width / 2, y: rect.top, closing: false });
    };

    const handleMouseLeave = () => {
        setTooltipState(prev => ({ ...prev, closing: true }));
        setTimeout(() => setTooltipState(prev => ({ ...prev, show: false, closing: false })), 150);
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(iban);
        setTooltipState(prev => ({ ...prev, text: 'Kopyalandı!' }));
        setTimeout(() => {
            setTooltipState(prev => ({ ...prev, text: iban }));
        }, 2000);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{iban.slice(0, 6)}...</span>
            <button
                type="button"
                className="action-btn"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleCopy}
            >
                <FiCopy size={13} />
            </button>
            
            {tooltipState.show && (
                <div
                    className={`date-tooltip ${tooltipState.closing ? 'date-tooltip--closing' : ''}`}
                    style={{ top: tooltipState.y, left: tooltipState.x }}
                >
                    <span className="date-tooltip__arrow" />
                    <div className="date-tooltip__text">{tooltipState.text}</div>
                </div>
            )}
        </div>
    );
};

export const employeeColumns = (handleEdit, handleDelete) => [
    {
        header: 'TC No',
        accessor: 'tcNo',
    },
    {
        header: 'Ad Soyad',
        render: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
        header: 'Yerleşke',
        render: (row) => row.unit?.location?.name || '-',
    },
    {
        header: 'Birim',
        render: (row) => row.unit?.name || '-',
    },
    {
        header: 'IBAN',
        render: (row) => row.ibanNo
            ? <IbanCell iban={row.ibanNo} />
            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
        header: 'İşe Giriş',
        render: (row) => row.startDate
            ? new Date(row.startDate).toLocaleDateString('tr-TR')
            : '-',
    },
    {
        header: 'Durum',
        render: (row) => <Pill cfg={getEmployeeStatusConfig(row.isActive)} />,
    },
    {
        header: 'İşlemler',
        width: '100px',
        render: (row) => (
            <div style={{ display: 'flex', gap: '4px' }}>
                <button className="action-btn edit-btn" onClick={() => handleEdit(row.id)}>
                    <FiEdit2 size={13} />
                </button>
                <button className="action-btn delete-btn" onClick={() => handleDelete(row.id)}>
                    <FiTrash2 size={13} />
                </button>
            </div>
        ),
    },
];
