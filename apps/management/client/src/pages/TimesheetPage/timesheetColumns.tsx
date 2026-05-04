/* ========================================================================
   TIMESHEET COLUMNS (PUANTAJ TABLO SÜTUNLARI)
   DataTable bileşenine verilecek olan sütun tanımlamaları.
   ======================================================================== */
import TimesheetDaysColumn from "./TimesheetDaysColumn/TimesheetDaysColumn";
import type { Column } from "../../components/DynamicTable/DynamicTable";
import type { TimesheetUIRow } from "../../hooks/data/useTimesheets";

export type { TimesheetUIRow };

/**
 * @param {string[]} periodDays       - periyottaki günlerin YYYY-MM-DD listesi
 * @param {function} onDayClick       - (row, dateStr) => void
 * @param {function} isDayCellDirty   - (rowId, dateStr) => boolean — opsiyonel
 * @param {string}   period           - YYYY-MM
 * @param {function} isPublicHoliday  - (dateStr) => boolean — opsiyonel
 */

export const timesheetColumns = (
  periodDays: string[],
  onDayClick: (row: TimesheetUIRow, dateStr: string, markerCode: string) => void,
  isDayCellDirty: ((rowId: string, dateStr: string) => boolean) | undefined,
  period: string,
  isPublicHoliday: ((dateStr: string) => boolean) | undefined,
): Column<TimesheetUIRow>[] => [
    { header: "TC No", accessor: "tc", width: "120px" },
    { header: "Ad Soyad", accessor: "name", width: "150px" },
    {
      header: <div style={{ textAlign: "center" }}>Çalışma Günleri</div>,
      // Bu sütun, ayın günlerini içeren devasa bir alt bileşeni (TimesheetDaysColumn) render eder.
      render: (row: TimesheetUIRow) => (
        <TimesheetDaysColumn
          timesheetDays={row.timesheet_days}
          periodDays={periodDays}
          period={period}
          onDayClick={(dateStr, markerCode) => onDayClick(row, dateStr, markerCode)}
          {...(isDayCellDirty ? { isDayCellDirty: (dateStr: string) => isDayCellDirty(row.id, dateStr) } : {})}
          {...(isPublicHoliday ? { isPublicHoliday } : {})}
          {...(row.isLocked !== undefined ? { isLocked: row.isLocked } : {})}
        />
      ),
    },
    {
      header: "Toplam",
      width: "60px",
      // Çalışanın o ayki toplam fiili çalışma gün sayısını gösterir
      render: (row: TimesheetUIRow) => (
        <div style={{ textAlign: "center" }}>{row.workDaysCount}</div>
      ),
    },
  ];

