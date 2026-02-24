import { useState, useEffect } from 'react';
import DynamicTable from '../../components/Table/DynamicTable';
import { employeeColumns } from '../../components/Table/TableColumns';
import { MOCK_DATA } from '../../components/Table/mockData';
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

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Çalışan Yönetimi</h1>
      </div>

      {/* Filters */}
        <div className="filter-area">
          <div className="floating-group floating-group--on-background">
            <select
              className="input"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option value="">Tüm Yerleşkeler</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <label className="floating-group__label">Yerleşke</label>
          </div>

          <div className="floating-group floating-group--on-background">
            <select
              className="input"
              value={filters.unit}
              onChange={(e) => handleFilterChange('unit', e.target.value)}
            >
              <option value="">Tüm Birimler</option>
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
            <label className="floating-group__label">Birim</label>
          </div>

          <div className="floating-group floating-group--on-background">
            <input
              type="text"
              className="input"
              placeholder=" "
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <label className="floating-group__label">Çalışan Adı Ara</label>
          </div>
        </div>
      
      <DynamicTable
        columns={employeeColumns}
        data={filteredData}
        pageSize={10}
      />
    </main>
  );
};

export default EmployeesPage;

