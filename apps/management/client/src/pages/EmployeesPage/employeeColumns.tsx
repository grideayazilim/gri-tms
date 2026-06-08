import { getEmployeeStatusConfig } from '../../constants/employees';
import { formatDate } from '../../utils/dateUtils';
import Pill from '../../components/DynamicTable/Pill/Pill';
import IbanCell from '../../components/DynamicTable/IbanCell/IbanCell';
import ActionButtons from '../../components/DynamicTable/ActionButtons/ActionButtons';
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
        header: 'Çalışma Yeri',
        render: (row) => {
            const locationName = row.unit?.location?.name;
            const unitName = row.unit?.name;
            if (locationName && unitName) {
                return `${locationName} / ${unitName}`;
            }
            return locationName || unitName || '-';
        },
    },
    {
        header: 'IBAN',
        render: (row) => row.ibanNo
            ? <IbanCell iban={row.ibanNo} />
            : <span className="cell-value--empty">—</span>,
    },
    {
        header: 'Telefon No',
        render: (row) => row.phoneNo || '-',
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
            <ActionButtons
                onEdit={() => handleEdit(row.id)}
                onDelete={() => handleDelete(row.id)}
            />
        ),
    },
];
