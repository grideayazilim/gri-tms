import { getEmployeeStatusConfig } from '../../constants/employees';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const Pill = ({ cfg }) => (
  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
    {cfg.label}
  </span>
);

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
