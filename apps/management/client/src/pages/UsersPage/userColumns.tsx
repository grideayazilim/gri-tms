import { getRoleConfig, getUserStatusConfig } from '../../constants/users';
import { formatDate } from '../../utils/dateUtils';
import Pill from '../../components/DynamicTable/Pill/Pill';
import ActionButtons from '../../components/DynamicTable/ActionButtons/ActionButtons';
import type { UserListItem } from '@timesheet/shared';
import type { Column } from '../../components/DynamicTable/DynamicTable';

export const userColumns = (
  handleEdit: (id: string) => void,
  handleDelete: (id: string) => void,
  // Oturumdaki kullanıcının kimliği — kendi satırında silme kapatılır
  currentUserId?: string,
): Column<UserListItem>[] => [
  { header: 'Kullanıcı Adı', accessor: 'username' },
  {
    header: 'Çalışma Yeri',
    render: (row) => {
      const locationName = row.unit?.location?.name;
      const unitName = row.unit?.name;
      if (locationName && unitName) {
        return `${locationName} / ${unitName}`;
      }
      return locationName || unitName || '-';
    },
  },
  {
    header: 'Rol',
    render: (row) => <Pill cfg={getRoleConfig(row.role)} />,
  },
  {
    header: 'Durum',
    render: (row) => <Pill cfg={getUserStatusConfig(row.status, row.expiryDate)} />,
  },
  {
    header: 'Geçerlilik Tarihi',
    render: (row) => row.expiryDate ? formatDate(row.expiryDate) : '-',
  },
  {
    header: 'İşlemler',
    width: '100px',
    render: (row) => (
      <ActionButtons
        onEdit={() => handleEdit(row.id)}
        onDelete={() => handleDelete(row.id)}
        deleteDisabled={row.id === currentUserId}
        {...(row.id === currentUserId ? { deleteTitle: 'Kendi hesabınızı silemezsiniz' } : {})}
      />
    ),
  },
];
