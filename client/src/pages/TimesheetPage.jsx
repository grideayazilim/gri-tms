import React, { useState } from 'react';
import DynamicTable from '../components/Table/DynamicTable';
import { timesheetColumns } from '../components/Table/TableColumns';
import { MOCK_DATA } from '../components/Table/mockData';

const TimesheetPage = () => {
    const [data, setData] = useState(MOCK_DATA); // TODO: API fetch ile değiştir

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

    return (
        <DynamicTable
            columns={timesheetColumns(handleDayClick)}
            data={data}
            pageSize={6}
            onSave={handleSave}
        />
    );
};

export default TimesheetPage;
