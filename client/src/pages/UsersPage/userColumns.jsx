import React from 'react';

export const userColumns = (handleEdit, handleDelete) => [
    { header: 'Kullanıcı Adı', accessor: 'username', width: '150px' },
    { header: 'Rol',           accessor: 'role',     width: '120px' },
    { header: 'Durum',         accessor: 'status',   width: '130px' },
    { header: 'Yerleşke', accessor: 'location', width: '150px', render: (row) => row.location || '-' },
    { header: 'Birim',    accessor: 'unit',     width: '150px', render: (row) => row.unit     || '-' },
    { header: 'Son Giriş', accessor: 'lastLogin', width: '150px', render: (row) => row.lastLogin || '-' },
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

export const supervisorColumns = [
    { header: 'Kullanıcı Adı',  accessor: 'username', width: '150px', render: (row) => row.name?.toLowerCase().replace(' ', '.') },
    { header: 'Yerleşke',       accessor: 'location', width: '150px' },
    { header: 'Birim',          accessor: 'unit',     width: '150px' },
    { header: 'Geçersiz Kalma', accessor: 'expiry',   width: '150px', render: () => '31.12.2026' },
    {
        header: 'İşlemler',
        width: '100px',
        render: () => (
            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="action-btn edit-btn">✎</button>
                <button className="action-btn delete-btn">🗑</button>
            </div>
        ),
    },
];
