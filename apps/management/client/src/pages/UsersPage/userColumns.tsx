import { getRoleConfig, getUserStatusConfig } from '../../constants/users';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';
import Pill from '../../components/Pill/Pill';
import type { UserListItem } from '@timesheet/shared';
import type { Column } from '../../components/DynamicTable/DynamicTable';

export const userColumns = (
  handleEdit: (id: string) => void,
  handleDelete: (id: string) => void
): Column<UserListItem>[] => [
  { header: 'Kullanıcı Adı', accessor: 'username', width: '150px' },
  {
    header: 'Yerleşke',
    width: '150px',
    render: (row) => row.unit?.location?.name || '-',
  },
  {
    header: 'Birim',
    accessor: 'unit',
    width: '150px',
    render: (row) => row.unit?.name || '-',
  },
  {
    header: 'Rol',
    width: '140px',
    render: (row) => <Pill cfg={getRoleConfig(row.role)} />,
  },
  {
    header: 'Durum',
    width: '140px',
    render: (row) => <Pill cfg={getUserStatusConfig(row.status, row.expiryDate)} />,
  },
  {
    header: 'Geçerlilik Tarihi',
    width: '150px',
    render: (row) => row.expiryDate ? formatDate(row.expiryDate) : '-',
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
