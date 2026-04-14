import { getRoleConfig, getUserStatusConfig } from '../../constants/users';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const Pill = ({ cfg }) => (
  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
    {cfg.label}
  </span>
);

export const userColumns = (handleEdit, handleDelete) => [
  { header: "Kullanıcı Adı", accessor: "username", width: "150px" },
  {
    header: "Yerleşke",
    accessor: "location",
    width: "150px",
    render: (row) => row.unit?.location?.name || "-",
  },
  {
    header: "Birim",
    accessor: "unit",
    width: "150px",
    render: (row) => row.unit?.name || "-",
  },
  {
    header: "Rol",
    width: "140px",
    render: (row) => <Pill cfg={getRoleConfig(row.role)} />,
  },
  {
    header: "Durum",
    width: "140px",
    render: (row) => <Pill cfg={getUserStatusConfig(row.status, row.expiryDate)} />,
  },
  {
    header: "Geçerlilik Tarihi",
    width: "150px",
    render: (row) => row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('tr-TR') : "-",
  },
  {
    header: "İşlemler",
    width: "100px",
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
