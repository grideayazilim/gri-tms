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
        header: 'Birim',
        render: (row) => row.unit?.name || '-',
    },
    { 
        header: 'Yerleşke',
        render: (row) => row.unit?.location?.name || '-',
    },
    { 
        header: 'IBAN',
        render: (row) => row.ibanNo
            ? `${row.ibanNo.slice(0, 6)}...`
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
        render: (row) => (
            <span style={{
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                background: row.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: row.isActive ? '#16a34a' : '#dc2626',
            }}>
                {row.isActive ? 'Aktif' : 'Pasif'}
            </span>
        ),
    },
    {
        header: 'İşlemler',
        width: '100px',
        render: (row) => (
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="action-btn edit-btn" onClick={() => handleEdit(row.id)}>✎</button>
                <button className="action-btn delete-btn" onClick={() => handleDelete(row.id)}>🗑</button>
            </div>
        ),
    },
];
