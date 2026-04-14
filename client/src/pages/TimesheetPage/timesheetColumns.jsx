import TimesheetDaysColumn from "./TimesheetDaysColumn/TimesheetDaysColumn";

/**
 * @param {string[]} periodDays       - periyottaki günlerin YYYY-MM-DD listesi
 * @param {function} onDayClick       - (row, dateStr) => void
 * @param {function} isDayCellDirty   - (rowId, dateStr) => boolean — opsiyonel
 * @param {string}   period           - YYYY-MM
 * @param {function} isPublicHoliday  - (dateStr) => boolean — opsiyonel
 */
export const timesheetColumns = (
  periodDays,
  onDayClick,
  isDayCellDirty,
  period,
  isPublicHoliday,
) => [
    { header: "TC No", accessor: "tc", width: "120px" },
    { header: "Ad Soyad", accessor: "name", width: "150px" },
    {
      header: <div style={{ textAlign: "center" }}>Çalışma Günleri</div>,
      render: (row) => (
        <TimesheetDaysColumn
          timesheetDays={row.timesheet_days}
          periodDays={periodDays}
          period={period}
          onDayClick={(dateStr, markerCode) => onDayClick(row, dateStr, markerCode)}
          isDayCellDirty={
            isDayCellDirty ? (dateStr) => isDayCellDirty(row.id, dateStr) : undefined
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
