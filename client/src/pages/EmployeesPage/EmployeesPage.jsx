import { useState, useEffect } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { employeeColumns } from './employeeColumns';
import { MOCK_DATA } from '../../components/DynamicTable/mockData';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useModal } from '../../components/Modal';
import EmployeeModal from './EmployeeModal/EmployeeModal';
import { useFilter } from '../../hooks/data/useFilter';
import { getEmployeeFilterConfig } from './employeeFilters';
import '../../styles/inputs.scss';

const EmployeesPage = () => {
  const [data, setData] = useState(MOCK_DATA); // TODO: API fetch ile değiştir
  const { showConfirm, showModal, closeModal } = useModal();

  const locations = [...new Set(data.map(item => item.location))].filter(Boolean);
  const units = [...new Set(data.map(item => item.unit))].filter(Boolean);

  const filterConfig = getEmployeeFilterConfig(locations, units);
  const { filters, handleFilterChange } = useFilter(filterConfig, {
    location: '',
    unit: '',
    search: '',
  });

  const handleDelete = async (employeeId) => {
    const confirmed = await showConfirm({
      title: 'Çalışanı Sil',
      message: 'Bu çalışanı silmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'Vazgeç',
    });
    
    if (confirmed) {
      setData(data.filter(e => e.id !== employeeId));
    }
  };

  const handleEdit = async (employeeId) => {
    const employeeToEdit = data.find(e => e.id === employeeId);
    if (!employeeToEdit) return;

    await showModal({
      title: 'Çalışan Düzenle',
      size: 'medium',
      content: (closeModal) => (
        <EmployeeModal 
          employee={employeeToEdit}
          onClose={() => closeModal(null)}
          onSave={(updatedData) => {
            const newEmployees = data.map(e => 
              e.id === employeeId ? { ...e, ...updatedData } : e
            );
            setData(newEmployees);
            closeModal(updatedData);
          }}
        />
      )
    });
  };

  const handleAdd = async () => {
    await showModal({
      title: 'Yeni Çalışan Ekle',
      size: 'medium',
      content: (closeModal) => (
        <EmployeeModal 
          onClose={() => closeModal(null)}
          onSave={(newData, mode) => {
            if (mode === 'SINGLE') {
                const newId = Math.max(...data.map(d => d.id || 0)) + 1;
                setData([...data, { id: newId, ...newData }]);
            } else {
                // Bulk logic handled in bulk mode internally or by API
            }
            closeModal(newData);
          }}
        />
      )
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
      {/* Filters */}
      <FilterBar config={filterConfig} filters={filters} onFilterChange={handleFilterChange} />
      
      <DynamicTable
        columns={employeeColumns(handleEdit, handleDelete)}
        data={data}
        pageSize={10}
      />
    </PageShell>
  );
};

export default EmployeesPage;

