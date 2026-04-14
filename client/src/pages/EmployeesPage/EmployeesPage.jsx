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
import { useLocationsAndUnits } from '../../hooks/data/useLocationsAndUnits';
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

  const {
    locations: apiLocations,
    units: apiUnits,
    fetchLocations,
    fetchUnitsByLocation,
  } = useLocationsAndUnits();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const locationOptions = useMemo(
    () => apiLocations.map(l => ({ label: l.name, value: String(l.id) })),
    [apiLocations]
  );
  const unitOptions = useMemo(
    () => apiUnits.map(u => ({ label: u.name, value: String(u.id) })),
    [apiUnits]
  );

  const filterConfig = useMemo(
    () => getEmployeeFilterConfig(locationOptions, unitOptions),
    [locationOptions, unitOptions]
  );
  const { filters, apiParams, handleFilterChange } = useFilter(filterConfig, {
    locationId: '',
    unitId: '',
    status: '',
    search: '',
  });

  // Seçili yerleşke değişince birimleri yükle
  useEffect(() => {
    if (filters.locationId) {
      fetchUnitsByLocation(filters.locationId);
    }
    // Yerleşke temizlenince birim filtresini de sıfırla
    if (!filters.locationId) {
      handleFilterChange('unitId', '');
    }
  }, [filters.locationId, fetchUnitsByLocation, handleFilterChange]);

  // İlk yüklemede ve filtre değiştiğinde çalışanları getir
  useEffect(() => {
    fetchEmployees(apiParams);
  }, [fetchEmployees, apiParams]);

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
        data={employees}
        loading={isLoading}
        pageSize={10}
      />
    </PageShell>
  );
};

export default EmployeesPage;
