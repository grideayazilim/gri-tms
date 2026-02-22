import React, { useState } from 'react';
import DynamicTable from '../components/Table/DynamicTable';
import { supervisorColumns } from '../components/Table/TableColumns';
import { MOCK_DATA } from '../components/Table/mockData';

const SupervisorPage = () => {
    const [data, setData] = useState(MOCK_DATA); // TODO: API fetch ile değiştir

    const handleSave = async () => {
        console.log('Kaydedilen birim sorumlusu verisi:', data);
        // TODO: await api.saveSupervisors(data);
        alert('Birim sorumlusu verisi kaydedildi! (Console\'a bakınız)');
    };

    return (
        <DynamicTable
            columns={supervisorColumns}
            data={data}
            pageSize={6}
            onSave={handleSave}
        />
    );
};

export default SupervisorPage;
