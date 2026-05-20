import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { MARKER_LIST, MARKERS, type MarkerCode } from "@timesheet/shared";
import type { TimesheetUIRow } from "../../../hooks/data/useTimesheets";
import "./TimesheetDaysColumn.scss";

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

const getDayValue = (timesheetDays: Record<string, string>, dateStr: string) => {
  return timesheetDays?.[dateStr] || "";
};

const isWeekendDay = (dateStr: string) => {
  if (!dateStr) return false;
  try {
    const weekday = parseISO(dateStr).getDay();
    return weekday === 0 || weekday === 6;
  } catch {
    return false;
  }
};

const OTHER_MARKERS = MARKER_LIST.filter((m) => m.code !== MARKERS.X.code);

// ─── Bileşen ──────────────────────────────────────────────────────────────────

interface TimesheetDaysColumnProps {
  row: TimesheetUIRow;
  timesheetDays: Record<string, MarkerCode>;
  originalDays?: Record<string, MarkerCode> | undefined;
  periodDays: string[];
  onDayClick: (row: TimesheetUIRow, dateStr: string, markerCode: MarkerCode) => void;
  isPublicHoliday?: ((dateStr: string) => boolean) | undefined;
  isLocked?: boolean;
}

const TimesheetDaysColumn = memo(({
  row,
  timesheetDays,
  originalDays,
  periodDays,
  onDayClick,
  isPublicHoliday,
  isLocked,
}: TimesheetDaysColumnProps) => {
  const [contextMenu, setContextMenu] = useState<{ day: string, centerX: number, y: number, showDate: boolean } | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuLeaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTriggered = useRef(false);

  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoverClosing, setHoverClosing] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(longPressTimer.current);
      clearTimeout(menuLeaveTimer.current);
      clearTimeout(hoverTimer.current);
      clearTimeout(hoverCloseTimer.current);
    };
  }, []);

  const closeMenu = useCallback(() => {
    if (!contextMenu || menuClosing) return;
    setMenuClosing(true);
    setTimeout(() => {
      setContextMenu(null);
      setMenuClosing(false);
    }, 150);
  }, [contextMenu, menuClosing]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && e.target instanceof Node && !menuRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [contextMenu, closeMenu]);

  const getDateTooltip = useCallback((dateStr: string) => {
    if (!dateStr) return "";
    try {
      return format(parseISO(dateStr), "d MMMM EEEE — yyyy", { locale: tr });
    } catch {
      return dateStr;
    }
  }, []);

  // ─── Periyot Bilgilerini Önceden Hesapla ──────────────────────────────
  // Bu sayede .map içinde 31 kez parseISO çağrılmasını engelliyoruz
  const dayMetadata = useMemo(() => {
    return periodDays.map(dateStr => ({
      dateStr,
      day: parseInt(dateStr.split("-")[2] ?? '', 10),
      isWeekend: isWeekendDay(dateStr),
      isHoliday: isPublicHoliday?.(dateStr) ?? false
    }));
  }, [periodDays, isPublicHoliday]);

  const handleContextMenu = (e: React.MouseEvent, dateStr: string, isHoliday: boolean) => {
    e.preventDefault();
    if (isLocked || isHoliday) return;

    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);

    const rect = e.currentTarget.getBoundingClientRect();
    setMenuClosing(false);
    setContextMenu({
      day: dateStr,
      centerX: rect.left + rect.width / 2,
      y: rect.bottom + 8,
      showDate: false,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, dateStr: string, isHoliday: boolean) => {
    longPressTriggered.current = false;
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);

    const rect = e.currentTarget.getBoundingClientRect();
    longPressTimer.current = setTimeout(() => {
      if (isLocked || isHoliday) return;
      longPressTriggered.current = true;
      setMenuClosing(false);
      setContextMenu({
        day: dateStr,
        centerX: rect.left + rect.width / 2,
        y: rect.bottom + 8,
        showDate: true,
      });
    }, 500);
  };

  const handleClick = (dateStr: string) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);
    onDayClick(row, dateStr, MARKERS.X.code);
  };

  const handleMouseEnter = (e: React.MouseEvent, dateStr: string) => {
    if (longPressTriggered.current) return;
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverClosing(false);

    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });

    hoverTimer.current = setTimeout(() => {
      setHoverDay(dateStr);
    }, 400);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    if (hoverDay && !hoverClosing) {
      setHoverClosing(true);
      hoverCloseTimer.current = setTimeout(() => {
        setHoverDay(null);
        setHoverClosing(false);
      }, 150);
    }
  };

  return (
    <div className="day-grid">
      {dayMetadata.map(({ dateStr, day, isWeekend, isHoliday }) => {
        const value = getDayValue(timesheetDays, dateStr);
        const originalValue = originalDays?.[dateStr] || "";
        const dirty = value !== originalValue;

        return (
          <button
            key={dateStr}
            type="button"
            className={[
              "ts-day-cell",
              value ? "ts-day-cell--marked" : "",
              isWeekend ? "ts-day-cell--weekend" : "",
              dirty ? "ts-day-cell--dirty" : "",
            ].filter(Boolean).join(" ")}
            onMouseEnter={(e) => handleMouseEnter(e, dateStr)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(dateStr)}
            onContextMenu={(e) => handleContextMenu(e, dateStr, isHoliday)}
            onTouchStart={(e) => handleTouchStart(e, dateStr, isHoliday)}
            onTouchEnd={() => clearTimeout(longPressTimer.current)}
            onTouchMove={() => clearTimeout(longPressTimer.current)}
            disabled={isLocked || isHoliday}
          >
            <span className={`ts-day-cell__num${value ? " ts-day-cell__num--top" : ""}`}>
              {day}
            </span>
            <span className={`ts-day-cell__value${value ? " ts-day-cell__value--active" : ""}`}>
              {value}
            </span>
          </button>
        );
      })}

      {hoverDay && !contextMenu && (
        <div
          className={`date-tooltip${hoverClosing ? " date-tooltip--closing" : ""}`}
          style={{ top: hoverPosition.y, left: hoverPosition.x }}
        >
          <span className="date-tooltip__arrow" />
          <div className="date-tooltip__text">{getDateTooltip(hoverDay)}</div>
        </div>
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className={`marker-tooltip${menuClosing ? " marker-tooltip--closing" : ""}`}
          style={{ top: contextMenu.y, left: contextMenu.centerX }}
          onMouseEnter={() => clearTimeout(menuLeaveTimer.current)}
          onMouseLeave={() => { menuLeaveTimer.current = setTimeout(closeMenu, 200); }}
        >
          <span className="marker-tooltip__arrow" />
          {contextMenu.showDate && (
            <div className="marker-tooltip__date">{getDateTooltip(contextMenu.day)}</div>
          )}
          <div className="marker-tooltip__items">
            {OTHER_MARKERS.map((m) => (
              <button
                key={m.code}
                type="button"
                className="marker-tooltip__btn"
                data-label={m.label}
                onClick={() => {
                  onDayClick(row, contextMenu.day, m.code);
                  setContextMenu(null);
                }}
              >
                {m.code}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default TimesheetDaysColumn;

