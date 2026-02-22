import React from 'react';

export const timesheetColumns = (handleDayClick) => [
    { header: 'TC No', accessor: 'tc', width: '120px' },
    { header: 'Ad Soyad', accessor: 'name', width: '180px' },
    {
        header: 'Çalışma Günü',
        accessor: 'timesheet_days',
        isDaysColumn: true,
        currentMonthDays: 31,
        onDayClick: (row, day, value) => handleDayClick(row.id, day, value),
    },
    {
        header: 'Çalışma Günü',
        accessor: 'timesheet_days',
        width: '100px',
        isCountCol: true,
        render: (row) => {
            const days = row.timesheet_days;
            if (!days) return <span className="work-days-count">0</span>;
            const count = Object.values(days).filter(v => v === 'X').length;
            return <span className="work-days-count">{count}</span>;
        }
    }
];

export const employeeColumns = [
    { header: 'TC No', accessor: 'tc', width: '120px' },
    { header: 'Ad Soyad', accessor: 'name', width: '180px' },
    { header: 'Birim', accessor: 'unit', width: '150px' },
    { header: 'Yerleşke', accessor: 'location', width: '150px' },
    { header: 'IBAN', accessor: 'iban', width: '200px', render: (row) => <span>TR12 3456... (Mock)</span> },
    { header: 'İşe Giriş', accessor: 'startDate', width: '120px', render: () => "01.01.2025" },
    {
        header: 'İşlemler',
        accessor: 'actions',
        width: '100px',
        render: (row) => (
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="action-btn edit-btn">✎</button>
                <button className="action-btn delete-btn">🗑</button>
            </div>
        )
    }
];

export const supervisorColumns = [
    { header: 'Kullanıcı Adı', accessor: 'username', width: '150px', render: (row) => row.name.toLowerCase().replace(' ', '.') },
    { header: 'Yerleşke', accessor: 'location', width: '150px' },
    { header: 'Birim', accessor: 'unit', width: '150px' },
    { header: 'Geçersiz Kalma', accessor: 'expiry', width: '150px', render: () => "31.12.2026" },
    {
        header: 'İşlemler',
        accessor: 'actions',
        width: '100px',
        render: (row) => (
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="action-btn edit-btn">✎</button>
                <button className="action-btn delete-btn">🗑</button>
            </div>
        )
    }
];
