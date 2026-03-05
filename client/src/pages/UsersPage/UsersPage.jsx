import { useState, useEffect } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { userColumns } from './userColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useModal } from '../../components/Modal';
import UserEditModal from './UserEditModal/UserEditModal';
import { useFilter } from '../../hooks/data/useFilter';
import { userFilterConfig } from './userFilters';
import '../../styles/inputs.scss';

const UsersPage = () => {
  // Mock data - TODO: API'den fetch et
  const [users, setUsers] = useState([
    {
      id: 1,
      username: 'admin_user',
      role: 'ADMIN',
      status: 'ACTIVE',
      location: null,
      unit: null,
      lastLogin: '2024-02-20 09:15',
      createdAt: '2024-01-01',
    },
    {
      id: 2,
      username: 'responsible_user',
      role: 'RESPONSIBLE',
      status: 'ACTIVE',
      location: 'Merkez Kampüs',
      unit: 'Bilgisayar Mühendisliği',
      lastLogin: '2024-02-19 14:30',
      createdAt: '2024-01-15',
    },
    {
      id: 3,
      username: 'pending_user',
      role: 'RESPONSIBLE',
      status: 'PENDING',
      location: 'Kuzey Kampüs',
      unit: 'Yazılım Mühendisliği',
      lastLogin: null,
      createdAt: '2024-02-18',
    },
  ]);

  const { showConfirm, showModal, closeModal } = useModal();

  const handleEdit = async (userId) => {
    const userToEdit = users.find(u => u.id === userId);
    if (!userToEdit) return;

    await showModal({
      title: 'Kullanıcıyı Düzenle',
      size: 'medium',
      content: (closeModal) => (
        <UserEditModal 
          user={userToEdit}
          onClose={() => closeModal(null)}
          onSave={(data) => {
            const updatedUsers = users.map(u => 
              u.id === userId ? { ...u, ...data, lastLogin: data.validityDate } : u
            );
            setUsers(updatedUsers);
            closeModal(data);
          }}
        />
      )
    });
  };

  const handleDelete = async (userId) => {
    const confirmed = await showConfirm({
      title: 'Kullanıcıyı Sil',
      message: 'Bu kullanıcıyı silmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
    });
    
    if (confirmed) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const { filteredData: filteredUsers, filters, handleFilterChange } = useFilter(users, userFilterConfig, {
    role: '',
    status: '',
    location: '',
    unit: '',
    search: '',
  });

  return (
    <PageShell title="Kullanıcılar">
      {/* Filters */}
      <FilterBar config={userFilterConfig} filters={filters} onFilterChange={handleFilterChange} />

      {/* Users Table */}
      <DynamicTable
        columns={userColumns(handleEdit, handleDelete)}
        data={filteredUsers}
        pageSize={10}
      />
    </PageShell>
  );
};

export default UsersPage;
