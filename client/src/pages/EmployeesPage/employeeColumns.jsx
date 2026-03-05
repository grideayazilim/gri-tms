export const employeeColumns = (handleEdit, handleDelete) => [
    { header: 'TC No',     accessor: 'tc'       },
    { header: 'Ad Soyad',  accessor: 'name'     },
    { header: 'Birim',     accessor: 'unit'     },
    { header: 'Yerleşke',  accessor: 'location' },
    { header: 'IBAN',      accessor: 'iban',      render: () => <span>TR12 3456... (Mock)</span> },
    { header: 'İşe Giriş', accessor: 'startDate', render: () => '01.01.2025' },
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
