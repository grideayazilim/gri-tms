import { useState, useEffect } from 'react';
import { AiOutlineBell } from 'react-icons/ai';
import DynamicTable from '../../components/Table/DynamicTable';
import { timesheetColumns } from '../../components/Table/TableColumns';
import { MOCK_DATA } from '../../components/Table/mockData';
import { useModal } from '../../components/Modal';
import { AnnouncementList } from '../../components/Announcements';
import '../../styles/page-layout.scss';
import '../../styles/inputs.scss';

const TimesheetPage = () => {
  const [data, setData] = useState(MOCK_DATA); // TODO: API fetch ile değiştir
  const [filters, setFilters] = useState({
    period: '2026-02', // Default current period
    location: '',
    unit: '',
    search: '',
  });
  const [filteredData, setFilteredData] = useState(data);
  const { showModal } = useModal();

  // Filtreleme için unique değerler
  const locations = [...new Set(data.map(item => item.location))].filter(Boolean);
  const units = [...new Set(data.map(item => item.unit))].filter(Boolean);

  // Dönem listesi (örnek - TODO: API'den gelecek)
  const periods = [
    { value: '2026-01', label: '2026 Ocak' },
    { value: '2026-02', label: '2026 Şubat' },
    { value: '2026-03', label: '2026 Mart' },
    { value: '2026-04', label: '2026 Nisan' },
    { value: '2026-05', label: '2026 Mayıs' },
    { value: '2026-06', label: '2026 Haziran' },
    { value: '2026-07', label: '2026 Temmuz' },
    { value: '2026-08', label: '2026 Ağustos' },
    { value: '2026-09', label: '2026 Eylül' },
    { value: '2026-10', label: '2026 Ekim' },
    { value: '2026-11', label: '2026 Kasım' },
    { value: '2026-12', label: '2026 Aralık' },
  ];

  // Filtre uygulaması
  useEffect(() => {
    let result = data;
    // TODO: Period filtresini API'den gelen veriye göre uygula
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

  const handleDayClick = (rowId, day, newValue) => {
    setData(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const dayStr = day.toString().padStart(2, '0');
      const existingKey = Object.keys(row.timesheet_days || {}).find(k => k.endsWith(`-${dayStr}`));
      const key = existingKey || `2026-02-${dayStr}`;
      return { ...row, timesheet_days: { ...row.timesheet_days, [key]: newValue } };
    }));
  };

  const handleSave = async () => {
    console.log('Kaydedilen puantaj verisi:', data);
    // TODO: await api.saveTimesheet(data);
    alert('Puantaj kaydedildi! (Console\'a bakınız)');
  };

  const handleOpenAnnouncements = async () => {
    await showModal({
      title: 'Duyurular',
      size: 'large',
      content: (onClose) => <AnnouncementList onClose={onClose} />,
    });
  };

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Puantaj İşaretleme</h1>
        <div className="page-actions">
          <button 
            className="btn btn--icon-only" 
            onClick={handleOpenAnnouncements}
            title="Duyurular"
          >
            <AiOutlineBell />
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>

      {/* Filters */}
        <div className="filter-area">
          <div className="floating-group floating-group--on-background">
            <select
              className="input"
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>{period.label}</option>
              ))}
            </select>
            <label className="floating-group__label">Dönem</label>
          </div>

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
        columns={timesheetColumns(handleDayClick)}
        data={filteredData}
        pageSize={10}
      />
    </main>
  );
};

export default TimesheetPage;
