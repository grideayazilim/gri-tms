import TimesheetDaysColumn from "./TimesheetDaysColumn/TimesheetDaysColumn";

/**
 * @param {number}   daysInMonth      - ayın gün sayısı
 * @param {function} onDayClick       - (row, day) => void
 * @param {function} isDayCellDirty   - (rowId, day) => boolean — opsiyonel
 * @param {string}   period           - YYYY-MM
 * @param {function} isPublicHoliday  - (day) => boolean — opsiyonel
 */
export const timesheetColumns = (
  daysInMonth,
  onDayClick,
  isDayCellDirty,
  period,
  isPublicHoliday,
) => [
  { header: "TC No", accessor: "tc", width: "120px" },
  { header: "Ad Soyad", accessor: "name", width: "150px" },
  {
    header: "Çalışma Günleri",
    render: (row) => (
      <TimesheetDaysColumn
        timesheetDays={row.timesheet_days}
        daysInMonth={daysInMonth}
        period={period}
        onDayClick={(day, markerCode) => onDayClick(row, day, markerCode)}
        isDayCellDirty={
          isDayCellDirty ? (day) => isDayCellDirty(row.id, day) : undefined
        }
        isPublicHoliday={isPublicHoliday}
        isLocked={row.isLocked}
      />
    ),
  },
  {
    header: "Toplam",
    width: "60px",
    render: (row) => (
      <div style={{ textAlign: "center" }}>{row.work_days_count}</div>
    ),
  },
];
