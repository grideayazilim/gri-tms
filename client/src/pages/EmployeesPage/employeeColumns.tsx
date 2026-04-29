import { getEmployeeStatusConfig } from '../../constants/employees';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';
import Pill from '../../components/Pill/Pill';
import IbanCell from '../../components/IbanCell/IbanCell';
import type { EmployeeListItem } from '@timesheet/shared';
import type { Column } from '../../components/DynamicTable/DynamicTable';

export const employeeColumns = (
    handleEdit: (id: string) => void,
    handleDelete: (id: string) => void
): Column<EmployeeListItem>[] => [
    {
        header: 'TC No',
        accessor: 'tcNo',
    },
    {
        header: 'Ad Soyad',
        render: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
        header: 'Yerleşke',
        render: (row) => row.unit?.location?.name || '-',
    },
    {
        header: 'Birim',
        render: (row) => row.unit?.name || '-',
    },
    {
        header: 'IBAN',
        render: (row) => row.ibanNo
            ? <IbanCell iban={row.ibanNo} />
            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
        header: 'İşe Giriş',
        render: (row) => row.startDate ? formatDate(row.startDate) : '-',
    },
    {
        header: 'Durum',
        render: (row) => <Pill cfg={getEmployeeStatusConfig(row.isActive)} />,
    },
    {
        header: 'İşlemler',
        width: '100px',
        render: (row) => (
            <div style={{ display: 'flex', gap: '4px' }}>
                <button className="action-btn edit-btn" onClick={() => handleEdit(row.id)}>
                    <FiEdit2 size={13} />
                </button>
                <button className="action-btn delete-btn" onClick={() => handleDelete(row.id)}>
                    <FiTrash2 size={13} />
                </button>
            </div>
        ),
    },
];
