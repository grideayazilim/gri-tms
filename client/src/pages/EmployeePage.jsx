import React, { useState } from 'react';
import DynamicTable from '../components/Table/DynamicTable';
import { employeeColumns } from '../components/Table/TableColumns';
import { MOCK_DATA } from '../components/Table/mockData';

const EmployeePage = () => {
    const [data, setData] = useState(MOCK_DATA); // TODO: API fetch ile değiştir

    const handleSave = async () => {
        console.log('Kaydedilen çalışan verisi:', data);
        // TODO: await api.saveEmployees(data);
        alert('Çalışan verisi kaydedildi! (Console\'a bakınız)');
    };

    return (
        <DynamicTable
            columns={employeeColumns}
            data={data}
            pageSize={6}
            onSave={handleSave}
        />
    );
};

export default EmployeePage;
