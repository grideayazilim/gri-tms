import { useState, useEffect } from 'react';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { employeeColumns } from './employeeColumns';
import { MOCK_DATA } from '../../components/DynamicTable/mockData';
import FilterBar from '../../components/FilterBar/FilterBar';
import '../../styles/page-layout.scss';
import '../../styles/inputs.scss';

const EmployeesPage = () => {
  const [data, setData] = useState(MOCK_DATA); // TODO: API fetch ile değiştir
  const [filters, setFilters] = useState({
    location: '',
    unit: '',
    search: '',
  });
  const [filteredData, setFilteredData] = useState(data);

  // Filtreleme için unique değerler
  const locations = [...new Set(data.map(item => item.location))].filter(Boolean);
  const units = [...new Set(data.map(item => item.unit))].filter(Boolean);

  // Filtre uygulaması
  useEffect(() => {
    let result = data;
    if (filters.location) result = result.filter(item => item.location === filters.location);
    if (filters.unit) result = result.filter(item => item.unit === filters.unit);
    if (filters.search) result = result.filter(item => 
      item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.tc.includes(filters.search)
    );
    setFilteredData(result);
  }, [data, filters]);

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const filterConfig = [
    { key: 'location', label: 'Yerleşke', type: 'select', options: locations, defaultOption: 'Tüm Yerleşkeler' },
    { key: 'unit', label: 'Birim', type: 'select', options: units, defaultOption: 'Tüm Birimler' },
    { key: 'search', label: 'Çalışan Adı Ara', type: 'text' },
  ];

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Çalışan Yönetimi</h1>
      </div>

      {/* Filters */}
      <FilterBar config={filterConfig} filters={filters} onFilterChange={handleFilterChange} />
      
      <DynamicTable
        columns={employeeColumns}
        data={filteredData}
        pageSize={10}
      />
    </main>
  );
};

export default EmployeesPage;

