import "./TimesheetDaysColumn.scss";

/**
 * Marker kodunu güvenli CSS class adına dönüştürür.
 *
 * Sorun: JS toLowerCase() Türkçe karakterleri beklenmedik dönüştürür.
 * 'İ'.toLowerCase() → 'i\u0307' (i + U+0307 birleşen nokta) üretir;
 * CSS'teki &--i ile eşleşmez → stil uygulanmaz.
 *
 * Çözüm: NFD normalize + combining karakterleri sıyır.
 *   'İ' → NFD → 'I\u0307' → toLowerCase → 'i\u0307' → strip → 'i'
 */
const toSafeCssClass = (code) =>
  code
    .normalize("NFD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");

const getDayValue = (timesheetDays, day) => {
  if (!timesheetDays) return "";
  const dayStr = day.toString().padStart(2, "0");
  const key = Object.keys(timesheetDays).find((k) => k.endsWith(`-${dayStr}`));
  return key ? timesheetDays[key] : "";
};

/**
 * Bir satırdaki tüm gün hücrelerini render eden sütun bileşeni.
 *
 * @param {object}   timesheetDays  - { "2026-02-05": "X", ... }
 * @param {number}   daysInMonth    - ayın gün sayısı
 * @param {function} onDayClick     - (day) => void
 * @param {function} isDayCellDirty - (day) => boolean — opsiyonel
 */
const TimesheetDaysColumn = ({
  timesheetDays,
  daysInMonth,
  onDayClick,
  isDayCellDirty,
}) => (
  <div className="day-grid">
    {Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const value = getDayValue(timesheetDays, day);
      const dirty = isDayCellDirty ? isDayCellDirty(day) : false;

      return (
        <button
          key={day}
          type="button"
          className={[
            "ts-day-cell",
            value ? `ts-day-cell--${toSafeCssClass(value)}` : "",
            dirty ? "ts-day-cell--dirty" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onDayClick(day)}
          title={`Gün ${day}${value ? `: ${value}` : ""}${dirty ? " (değiştirildi)" : ""}`}
        >
          <span
            className={`ts-day-cell__num${value ? " ts-day-cell__num--top" : ""}`}
          >
            {day}
          </span>
          {value && <span className="ts-day-cell__value">{value}</span>}
        </button>
      );
    })}
  </div>
);

export default TimesheetDaysColumn;
