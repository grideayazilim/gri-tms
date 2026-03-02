import { useState, useEffect } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { userColumns } from './userColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import '../../styles/page-layout.scss';
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

  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
  });

  const [filteredUsers, setFilteredUsers] = useState(users);

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const handleEdit = (userId) => {
    console.log('Edit user:', userId);
    // TODO: Open edit modal
  };

  const handleDelete = (userId) => {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  // Filter logic
  useEffect(() => {
    let result = users;
    if (filters.role) result = result.filter(user => user.role === filters.role);
    if (filters.status) result = result.filter(user => user.status === filters.status);
    if (filters.search) result = result.filter(user => 
      user.username.toLowerCase().includes(filters.search.toLowerCase())
    );
    setFilteredUsers(result);
  }, [users, filters]);

  const pendingUsers = users.filter(u => u.status === 'PENDING');

  const filterConfig = [
    { 
      key: 'role', 
      label: 'Rol', 
      type: 'select', 
      options: [
        { value: 'ADMIN', label: 'Admin' }, 
        { value: 'RESPONSIBLE', label: 'Sorumlu' }
      ], 
      defaultOption: 'Tüm Roller' 
    },
    { 
      key: 'status', 
      label: 'Durum', 
      type: 'select', 
      options: [
        { value: 'ACTIVE', label: 'Aktif' }, 
        { value: 'PENDING', label: 'Onay Bekliyor' }
      ], 
      defaultOption: 'Tüm Durumlar' 
    },
    { key: 'search', label: 'Kullanıcı Adı Ara', type: 'text' },
  ];

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Kullanıcı Yönetimi</h1>
      </div>

      {/* Pending Users Alert */}
      {pendingUsers.length > 0 && (
        <div className="pending-alert">
          <div className="pending-alert__content">
            <strong>{pendingUsers.length}</strong> kullanıcı onay bekliyor
          </div>
          <button className="btn btn--sm btn--primary">
            Onay Bekleyenleri Görüntüle
          </button>
        </div>
      )}

      {/* Filters */}
      <FilterBar config={filterConfig} filters={filters} onFilterChange={handleFilterChange} />

      {/* Users Table */}
      <DynamicTable
        columns={userColumns(handleEdit, handleDelete)}
        data={filteredUsers}
        pageSize={10}
      />
    </main>
  );
};

export default UsersPage;
