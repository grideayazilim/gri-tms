import TimesheetDaysColumn from './TimesheetDaysColumn/TimesheetDaysColumn';

/**
 * @param {number}   daysInMonth    - ayın gün sayısı
 * @param {function} onDayClick     - (row, day) => void
 * @param {function} isDayCellDirty - (rowId, day) => boolean — opsiyonel
 */
export const timesheetColumns = (daysInMonth, onDayClick, isDayCellDirty) => [
    { header: 'TC No',    accessor: 'tc',   width: '150px' },
    { header: 'Ad Soyad', accessor: 'name', width: '180px' },
    {
        header: 'Çalışma Günleri',
        render: (row) => (
            <TimesheetDaysColumn
                timesheetDays={row.timesheet_days}
                daysInMonth={daysInMonth}
                onDayClick={(day) => onDayClick(row, day)}
                isDayCellDirty={isDayCellDirty ? (day) => isDayCellDirty(row.id, day) : undefined}
            />
        ),
    },
    { 
        header: 'Toplam', 
        width: '70px', 
        render: (row) => (<div style={{ textAlign: 'center' }}>{row.work_days_count}</div>) 
    },
];
