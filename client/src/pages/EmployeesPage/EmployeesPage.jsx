import { useState, useEffect, useMemo } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { employeeColumns } from './employeeColumns';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useModal } from '../../components/Modal';
import EmployeeModal from './EmployeeModal/EmployeeModal';
import { useFilter } from '../../hooks/data/useFilter';
import { getEmployeeFilterConfig } from './employeeFilters';
import { useEmployees } from '../../hooks/data/useEmployees';
import '../../styles/inputs.scss';

const EmployeesPage = () => {
  const {
    employees,
    isLoading,
    fetchEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
  } = useEmployees();
  const { showConfirm, showModal } = useModal();

  // İlk yüklemede çalışanları getir
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Filtre seçeneklerini gerçek veriden türet
  const locationOptions = useMemo(
    () => [...new Set(employees.map(e => e.unit?.location?.name).filter(Boolean))],
    [employees]
  );
  const unitOptions = useMemo(
    () => [...new Set(employees.map(e => e.unit?.name).filter(Boolean))],
    [employees]
  );

  const filterConfig = getEmployeeFilterConfig(locationOptions, unitOptions);
  const { filters, handleFilterChange } = useFilter(filterConfig, {
    locationName: '',
    unitName: '',
    search: '',
  });

  // Client-side filtering: apply each filter's `apply` function
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      filterConfig.every(config => {
        const value = filters[config.key];
        if (!value || !config.apply) return true;
        return config.apply(emp, value);
      })
    );
  }, [employees, filters, filterConfig]);

  const handleDelete = async (employeeId) => {
    const confirmed = await showConfirm({
      title: 'Çalışanı Sil',
      message: 'Bu çalışanı silmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
    });
    if (confirmed) {
      await removeEmployee(employeeId);
    }
  };

  const handleEdit = async (employeeId) => {
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
            if (result.success) closeModal(updatedData);
            return result;
          }}
        />
      ),
    });
  };

  const handleAdd = async () => {
    await showModal({
      title: 'Yeni Çalışan Ekle',
      size: 'medium',
      content: (closeModal) => (
        <EmployeeModal
          onClose={() => closeModal(null)}
          onSave={async (newData) => {
            const result = await addEmployee(newData);
            if (result.success) closeModal(newData);
            return result;
          }}
        />
      ),
    });
  };

  const headerActions = (
    <div className="page-header__actions">
      <button className="btn btn--primary" onClick={handleAdd}>
        + Yeni Çalışan Ekle
      </button>
    </div>
  );

  return (
    <PageShell title="Çalışanlar" headerActions={headerActions}>
      <FilterBar config={filterConfig} filters={filters} onFilterChange={handleFilterChange} />
      <DynamicTable
        columns={employeeColumns(handleEdit, handleDelete)}
        data={filteredEmployees}
        loading={isLoading}
        pageSize={10}
      />
    </PageShell>
  );
};

export default EmployeesPage;
