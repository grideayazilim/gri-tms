import { useState, useEffect, useMemo, useCallback } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { userColumns } from './userColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useModal } from '../../components/Modal';
import UserEditModal from './UserEditModal/UserEditModal';
import { useFilter } from '../../hooks/data/useFilter';
import { userFilterConfig } from './userFilters';
import { useUsers } from '../../hooks/data/useUsers';
import { useLocationUnitFilter } from '../../hooks/data/useLocationUnitFilter';
import { useToast } from '../../components/ToastBar/ToastContext';
import '../../styles/inputs.scss';
import type { UserEditType } from '@timesheet/shared';

const PAGE_LIMIT = 10;

const UsersPage = () => {
  const { users, pagination, isLoading, fetchUsers, editUser, removeUser } = useUsers();

  const [page, setPage] = useState(1);

  const { filters, apiParams, handleFilterChange } = useFilter(
    useMemo(() => userFilterConfig([], []), []),
    { role: '', status: '', locationId: '', unitId: '', search: '' },
  );

  const handleFilterChangeAndReset = useCallback((key: string, value: string) => {
    handleFilterChange(key, value);
    setPage(1);
  }, [handleFilterChange]);

  const { locationOptions, unitOptions } = useLocationUnitFilter(
    filters.locationId || '',
    handleFilterChangeAndReset,
  );

  const filterConfig = useMemo(
    () => userFilterConfig(locationOptions, unitOptions),
    [locationOptions, unitOptions],
  );

  useEffect(() => {
    // Filtreler veya sayfa numarası değiştiğinde kullanıcı listesini tazeler
    fetchUsers({ ...apiParams, page, limit: PAGE_LIMIT });
  }, [fetchUsers, apiParams, page]);


  const { showConfirm, showModal } = useModal();
  const toast = useToast();

  const handleEdit = async (userId: string) => {
    const userToEdit = users.find((u) => u.id === userId);
    if (!userToEdit) return;

    await showModal({
      title: 'Kullanıcıyı Düzenle',
      size: 'medium',
      content: (closeModal) => (
        <UserEditModal
          user={userToEdit}
          onClose={() => closeModal(null)}
          onSave={async (data) => {
            const result = await editUser(userId, data);
            if (result.success) {
              toast({ type: 'success', message: 'Kullanıcı başarıyla güncellendi' });
              fetchUsers({ ...apiParams, page, limit: PAGE_LIMIT });
              closeModal(data);
            } else {
              toast({ type: 'error', message: result.error || 'Güncelleme işlemi başarısız' });
            }
          }}
        />
      ),
    });
  };

  const handleDelete = async (userId: string) => {
    const confirmed = await showConfirm({
      title: 'Kullanıcıyı Sil',
      message: 'Bu kullanıcıyı silmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
    });

    if (confirmed) {
      const result = await removeUser(userId);
      if (result.success) {
        toast({ type: 'success', message: 'Kullanıcı başarıyla silindi' });
        fetchUsers({ ...apiParams, page, limit: PAGE_LIMIT });
      } else {
        toast({ type: 'error', message: result.error || 'Silme işlemi başarısız' });
      }
    }
  };

  return (
    <PageShell title="Kullanıcılar">
      <FilterBar
        config={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChangeAndReset}
      />
      <DynamicTable
        columns={userColumns(handleEdit, handleDelete)}
        data={users}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />
    </PageShell>
  );
};

export default UsersPage;
