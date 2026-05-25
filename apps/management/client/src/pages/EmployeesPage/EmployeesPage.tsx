import { useState, useMemo, useEffect, useCallback } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { employeeColumns } from './employeeColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useModal } from '../../components/Modal';
import EmployeeModal from './EmployeeModal/EmployeeModal';
import { useFilter } from '../../hooks/data/useFilter';
import { getEmployeeFilterConfig } from './employeeFilters';
import { useEmployees } from '../../hooks/data/useEmployees';
import { useLocationUnitFilter } from '../../hooks/data/useLocationUnitFilter';
import { useToast } from '../../components/ToastBar/useToast';
import '../../styles/inputs.scss';
import type { EmployeeType } from '@timesheet/shared';
import { DEFAULT_PAGINATION } from '../../constants/pagination';

const PAGE_LIMIT = DEFAULT_PAGINATION.limit;

const EmployeesPage = () => {
  const {
    employees,
    pagination,
    isLoading,
    fetchEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
  } = useEmployees();
  const { showConfirm, showModal } = useModal();
  const toast = useToast();

  const [page, setPage] = useState(1);

  const { filters, apiParams, handleFilterChange } = useFilter(
    useMemo(() => getEmployeeFilterConfig([], []), []),
    { locationId: '', unitId: '', status: '', search: '' },
  );

  // Herhangi bir filtre değiştiğinde sayfayı otomatik olarak 1. sayfaya çeker.
  // Bu sayede örn: 5. sayfadayken bir arama yapıldığında boş sonuç görme riski engellenir.
  const handleFilterChangeAndReset = useCallback((key: string, value: string) => {
    handleFilterChange(key, value);
    setPage(1);
  }, [handleFilterChange]);


  const { locationOptions, unitOptions } = useLocationUnitFilter(
    filters.locationId || '',
    handleFilterChangeAndReset,
  );

  const filterConfig = useMemo(
    () => getEmployeeFilterConfig(locationOptions, unitOptions),
    [locationOptions, unitOptions],
  );

  useEffect(() => {
    fetchEmployees({ ...apiParams, page, limit: PAGE_LIMIT });
  }, [fetchEmployees, apiParams, page]);

  const handleDelete = async (employeeId: string) => {
    const confirmed = await showConfirm({
      title: 'Çalışanı Sil',
      message: 'Bu çalışanı silmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
    });
    if (confirmed) {
      const result = await removeEmployee(employeeId);
      if (result.success) {
        toast({ type: 'success', message: 'Çalışan başarıyla silindi' });
        fetchEmployees({ ...apiParams, page, limit: PAGE_LIMIT });
      } else {
        toast({ type: 'error', message: result.error || 'Silme işlemi başarısız' });
      }
    }
  };

  const handleEdit = async (employeeId: string) => {
    const employeeToEdit = employees.find(e => e.id === employeeId);
    if (!employeeToEdit) return;

    await showModal({
      title: 'Çalışan Düzenle',
      size: 'medium',
      content: (closeModal) => (
        <EmployeeModal
          employee={employeeToEdit}
          onClose={() => closeModal(null)}
          onSave={async (updatedData) => {
            const result = await editEmployee(employeeId, updatedData);
            if (result.success) {
              toast({ type: 'success', message: 'Çalışan başarıyla güncellendi' });
              fetchEmployees({ ...apiParams, page, limit: PAGE_LIMIT });
              closeModal(updatedData);
            }
            return result;
          }}
        />
      ),
    });
  };

  const handleAdd = async () => {
    // showModal içerisine içeriği (content) bir render function olarak veriyoruz.
    // closeModal parametresi ile modal'ı içeriden kapatabiliyoruz.
    await showModal({
      title: 'Yeni Çalışan Ekle',
      size: 'medium',
      content: (closeModal) => (
        <EmployeeModal
          onClose={() => closeModal(null)}
          onSave={async (newData) => {
            const result = await addEmployee(newData);
            if (result.success) {
              toast({ type: 'success', message: 'Çalışan başarıyla eklendi' });
              // Yeni eklenen en üstte görünsün diye sayfayı 1'e çekiyoruz
              fetchEmployees({ ...apiParams, page: 1, limit: PAGE_LIMIT });
              setPage(1);
              closeModal(newData);
            }
            return result;
          }}
        />
      ),
    });
  };

  const headerActions = (
    <div className="page-header__actions">
      <button className="btn" onClick={handleAdd}>
        + Yeni Çalışan Ekle
      </button>
    </div>
  );

  return (
    <PageShell title="Çalışanlar" headerActions={headerActions}>
      <FilterBar config={filterConfig} filters={filters} onFilterChange={handleFilterChangeAndReset} />
      <DynamicTable
        columns={employeeColumns(handleEdit, handleDelete)}
        data={employees}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
      />
    </PageShell>
  );
};

export default EmployeesPage;
