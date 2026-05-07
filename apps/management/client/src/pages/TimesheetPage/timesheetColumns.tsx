/* ========================================================================
   TIMESHEET COLUMNS (PUANTAJ TABLO SÜTUNLARI)
   DataTable bileşenine verilecek olan sütun tanımlamaları.
   ======================================================================== */
import TimesheetDaysColumn from "./TimesheetDaysColumn/TimesheetDaysColumn";
import type { Column } from "../../components/DynamicTable/DynamicTable";
import type { MarkerCode, TimesheetUIRow } from "../../hooks/data/useTimesheets";

export type { TimesheetUIRow };

export const timesheetColumns = (
  periodDays: string[],
  onDayClick: (row: TimesheetUIRow, dateStr: string, markerCode: MarkerCode) => void,
  originalSnapshot: TimesheetUIRow[],
  isPublicHoliday: ((dateStr: string) => boolean) | undefined,
): Column<TimesheetUIRow>[] => [
    { header: "TC No", accessor: "tc", width: "120px" },
    { header: "Ad Soyad", accessor: "name", width: "150px" },
    {
      header: <div style={{ textAlign: "center" }}>Çalışma Günleri</div>,
      render: (row: TimesheetUIRow) => {
        const originalRow = originalSnapshot.find((s) => s.id === row.id);
        return (
          <TimesheetDaysColumn
            timesheetDays={row.timesheet_days}
            originalDays={originalRow?.timesheet_days}
            periodDays={periodDays}
            onDayClick={(dateStr, markerCode) => onDayClick(row, dateStr, markerCode)}
            isPublicHoliday={isPublicHoliday}
            isLocked={row.isLocked}
          />
        );
      },
    },
    {
      header: "Toplam",
      width: "60px",
      render: (row: TimesheetUIRow) => (
        <div style={{ textAlign: "center" }}>{row.workDaysCount}</div>
      ),
    },
  ];

