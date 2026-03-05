import { useState, useEffect } from 'react';
import { AiOutlineBell } from 'react-icons/ai';
import DynamicTable from '../../components/DynamicTable/DynamicTable';
import { timesheetColumns } from './timesheetColumns';
import { MOCK_DATA } from '../../components/DynamicTable/mockData';
import { useModal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { AnnouncementList } from '../../components/Announcements';
import MarkerSelector, { MARKERS } from './MarkerSelector/MarkerSelector';
import FilterBar from '../../components/FilterBar/FilterBar';
import PageShell from '../../components/PageShell/PageShell';
import { useFilter } from '../../hooks/data/useFilter';
import { getTimesheetFilterConfig } from './timesheetFilters';
import '../../styles/inputs.scss';
import './TimesheetPage.scss';

const TimesheetPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(MOCK_DATA); // TODO: API fetch ile değiştir
  const [originalData, setOriginalData] = useState(MOCK_DATA); // To track dirty state natively
  const [selectedMarker, setSelectedMarker] = useState('X'); // Default selected marker
  const { showModal } = useModal();

  const locations = [...new Set(data.map(item => item.location))].filter(Boolean);
  const units = [...new Set(data.map(item => item.unit))].filter(Boolean);

  // Dönem listesi (örnek - TODO: API'den gelecek)
  const periods = [
    { value: '2026-01', label: '2026 Ocak' },
    { value: '2026-02', label: '2026 Şubat' },
    { value: '2026-03', label: '2026 Mart' },
    { value: '2026-04', label: '2026 Nisan' },
  ];

  const filterConfig = getTimesheetFilterConfig(periods, locations, units);
  const { filteredData, filters, handleFilterChange } = useFilter(data, filterConfig, {
    period: '2026-02',
    location: '',
    unit: '',
    search: '',
  });

  const handleDayClick = (row, day) => {
    if (!selectedMarker) {
        alert("Lütfen önce bir işaretçi seçiniz!");
        return;
    }
    setData(prev => prev.map(r => {
      if (r.id !== row.id) return r;
      const dayStr = day.toString().padStart(2, '0');
      const key = `${filters.period}-${dayStr}`;

      const newDays = { ...r.timesheet_days };
      if (newDays[key] === selectedMarker) {
        delete newDays[key];
      } else {
        newDays[key] = selectedMarker;
      }
      
      // Calculate the new total based on isPaid flags
      const paidMarkerCodes = MARKERS.filter(m => m.isPaid).map(m => m.code);
      const newCount = Object.values(newDays).filter(val => paidMarkerCodes.includes(val)).length;

      return { ...r, timesheet_days: newDays, work_days_count: newCount };
    }));
  };

  const isDayCellDirty = (rowId, day) => {
    const dayStr = day.toString().padStart(2, '0');
    const key = `${filters.period}-${dayStr}`;
    
    const originalRow = originalData.find(r => r.id === rowId);
    if (!originalRow) return false;

    const originalVal = originalRow.timesheet_days?.[key] || '';
    const currentVal = data.find(r => r.id === rowId)?.timesheet_days?.[key] || '';
    
    return originalVal !== currentVal;
  };
  
  const hasGlobalChanges = data.some(r => {
     const originalRow = originalData.find(o => o.id === r.id);
     if (!originalRow) return false;
     return JSON.stringify(r.timesheet_days || {}) !== JSON.stringify(originalRow.timesheet_days || {});
  });

  const handleSave = async () => {
    console.log('Kaydedilen puantaj verisi:', data);
    setOriginalData(JSON.parse(JSON.stringify(data)));
    alert('Puantaj kaydedildi! (Console\'a bakınız)');
  };

  const handleOpenAnnouncements = async () => {
    await showModal({
      title: 'Duyurular',
      size: 'large',
      content: (onClose) => <AnnouncementList onClose={onClose} />,
    });
  };

  const getDaysInMonth = (periodStr) => {
    if (!periodStr) return 30;
    const [year, month] = periodStr.split('-');
    return new Date(year, month, 0).getDate();
  };
  const currentDaysInMonth = getDaysInMonth(filters.period);

  const headerActions = (
    <>
      {hasGlobalChanges && (
         <button className="btn btn--primary" onClick={handleSave}>
           Değişiklikleri Kaydet
         </button>
      )}
    </>
  );

  const userName = user?.name || user?.username || 'Kullanıcı';

  return (
    <PageShell title="Puantaj İşaretleme" headerActions={headerActions}>

      <div className="ts-user-badge">
        <button 
          className="announcement-icon-btn" 
          onClick={handleOpenAnnouncements}
          title="Duyurular"
        >
          <AiOutlineBell />
        </button>
        <span className="user-info">
          Kullanıcı: {userName}
        </span>
      </div>

      {/* Filters */}
      <FilterBar config={filterConfig} filters={filters} onFilterChange={handleFilterChange} />
      
      <MarkerSelector selected={selectedMarker} onSelect={setSelectedMarker} />

      <DynamicTable
        columns={timesheetColumns(currentDaysInMonth, handleDayClick, isDayCellDirty)}
        data={filteredData}
        pageSize={10}
      />
    </PageShell>
  );
};

export default TimesheetPage;
