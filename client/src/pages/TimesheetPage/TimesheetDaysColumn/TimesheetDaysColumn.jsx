import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { MARKER_LIST, MARKERS } from "../../../constants/markers";
import "./TimesheetDaysColumn.scss";

const getDayValue = (timesheetDays, day) => {
  if (!timesheetDays) return "";
  const dayStr = day.toString().padStart(2, "0");
  const key = Object.keys(timesheetDays).find((k) => k.endsWith(`-${dayStr}`));
  return key ? timesheetDays[key] : "";
};

const isWeekendDay = (period, day) => {
  if (!period) return false;

  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return false;

  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6;
};

// X dışındaki işaretçiler — sağ tık / long press menüsünde gösterilir
const OTHER_MARKERS = MARKER_LIST.filter((m) => m.code !== MARKERS.X.code);

/**
 * Bir satırdaki tüm gün hücrelerini render eden sütun bileşeni.
 *
 * @param {object}   timesheetDays   - { "2026-02-05": "X", ... }
 * @param {number}   daysInMonth     - ayın gün sayısı
 * @param {string}   period          - YYYY-MM
 * @param {function} onDayClick      - (day, markerCode) => void
 * @param {function} isDayCellDirty  - (day) => boolean — opsiyonel
 * @param {function} isPublicHoliday - (day) => boolean — opsiyonel
 */
const TimesheetDaysColumn = ({
  period,
  timesheetDays,
  daysInMonth,
  onDayClick,
  isDayCellDirty,
  isPublicHoliday,
  isLocked,
}) => {
  // ── Sağ tık / long press menü state ────────────────────────────────────
  const [contextMenu, setContextMenu] = useState(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuRef = useRef(null);
  const menuLeaveTimer = useRef(null);
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  // ── Hover tooltip state (react-tooltip yerine) ────────────────────────
  const [hoverDay, setHoverDay] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoverClosing, setHoverClosing] = useState(false);
  const hoverTimer = useRef(null);
  const hoverCloseTimer = useRef(null);

  // Animasyonlu kapanış
  const closeMenu = useCallback(() => {
    if (!contextMenu || menuClosing) return;
    setMenuClosing(true);
    setTimeout(() => {
      setContextMenu(null);
      setMenuClosing(false);
    }, 150);
  }, [contextMenu, menuClosing]);

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
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

  // ── Tarih bilgisi formatı ──────────────────────────────────────────────
  const getDateTooltip = useCallback(
    (day) => {
      if (!period) return `Gün ${day}`;
      const dayStr = day.toString().padStart(2, "0");
      const dateStr = `${period}-${dayStr}`;
      try {
        const date = parseISO(dateStr);
        return format(date, "d MMMM EEEE — yyyy", { locale: tr });
      } catch {
        return `Gün ${day}`;
      }
    },
    [period],
  );

  // ── Sağ tık — marker menüsü aç (desktop) ──────────────────────────────
  const handleContextMenu = (e, day) => {
    e.preventDefault();
    if (isLocked || isPublicHoliday?.(day)) return;

    // Hover varsa hemen sıfırla
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);
    setHoverClosing(false);

    const rect = e.currentTarget.getBoundingClientRect();
    setMenuClosing(false);
    setContextMenu({
      day,
      centerX: rect.left + rect.width / 2,
      y: rect.bottom + 8,
      showDate: false,
    });
  };

  const handleTouchStart = (e, day) => {
    longPressTriggered.current = false;
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);
    setHoverClosing(false);

    const rect = e.currentTarget.getBoundingClientRect();

    longPressTimer.current = setTimeout(() => {
      if (isLocked || isPublicHoliday?.(day)) return;
      longPressTriggered.current = true;
      setMenuClosing(false);
      setContextMenu({
        day,
        centerX: rect.left + rect.width / 2,
        y: rect.bottom + 8,
        showDate: true,
      });
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleTouchMove = () => {
    clearTimeout(longPressTimer.current);
  };

  // Sol tık — long press tetiklendiyse tıklamayı yoksay
  const handleClick = (day) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);
    setHoverClosing(false);
    onDayClick(day, MARKERS.X.code);
  };

  // ── Hover tooltip işlemleri ──────────────────────────────────────────────
  const handleMouseEnter = (e, day) => {
    if (longPressTriggered.current) return;

    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverClosing(false);

    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.top, // üstte görünmesi için css ile translateY yapılacak
    });

    hoverTimer.current = setTimeout(() => {
      setHoverDay(day);
    }, 400); // delayShow=400ms muadili
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

  // ── Context menüden işaretçi seçimi ─────────────────────────────────────
  const handleMarkerSelect = (markerCode) => {
    if (contextMenu) {
      onDayClick(contextMenu.day, markerCode);
      setContextMenu(null);
      setMenuClosing(false);
    }
  };

  // ── Menü hover — menüden çıkınca kapat ─────────────────────────────────
  const handleMenuMouseEnter = () => {
    clearTimeout(menuLeaveTimer.current);
  };

  const handleMenuMouseLeave = () => {
    menuLeaveTimer.current = setTimeout(closeMenu, 200);
  };

  return (
    <div className="day-grid">
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const value = getDayValue(timesheetDays, day);
        const dirty = isDayCellDirty ? isDayCellDirty(day) : false;
        const isWeekend = isWeekendDay(period, day);
        const isHoliday = isPublicHoliday ? isPublicHoliday(day) : false;

        return (
          <button
            key={day}
            type="button"
            className={[
              "ts-day-cell",
              value ? "ts-day-cell--marked" : "",
              isWeekend ? "ts-day-cell--weekend" : "",
              dirty ? "ts-day-cell--dirty" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onMouseEnter={(e) => handleMouseEnter(e, day)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(day)}
            onContextMenu={(e) => handleContextMenu(e, day)}
            onTouchStart={(e) => handleTouchStart(e, day)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            disabled={isLocked || isHoliday}
          >
            <span
              className={`ts-day-cell__num${value ? " ts-day-cell__num--top" : ""}`}
            >
              {day}
            </span>
            <AnimatePresence>
              {value ? (
                <motion.span
                  key={value}
                  className="ts-day-cell__value"
                  initial={{ opacity: 0, top: 18, x: "-50%" }}
                  animate={{ opacity: 1, top: 11, x: "-50%" }}
                  exit={{ opacity: 0, top: 18, x: "-50%" }}
                  transition={{ duration: 0.25, ease: "ease" }}
                >
                  {value}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        );
      })}

      {/* Sadece gün gösteren menü (hover) */}
      {hoverDay && !contextMenu && (
        <div
          className={`date-tooltip${hoverClosing ? " date-tooltip--closing" : ""}`}
          style={{ top: hoverPosition.y, left: hoverPosition.x }}
        >
          <span className="date-tooltip__arrow" />
          <div className="date-tooltip__text">{getDateTooltip(hoverDay)}</div>
        </div>
      )}

      {/* Marker seçim menüsü (sağ tıkla gelecek) */}
      {contextMenu && (
        <div
          ref={menuRef}
          className={`marker-tooltip${menuClosing ? " marker-tooltip--closing" : ""}`}
          style={{ top: contextMenu.y, left: contextMenu.centerX }}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          <span className="marker-tooltip__arrow" />
          {/* Mobil long press'te tarih bilgisini de göster */}
          {contextMenu.showDate && (
            <div className="marker-tooltip__date">
              {getDateTooltip(contextMenu.day)}
            </div>
          )}
          <div className="marker-tooltip__items">
            {OTHER_MARKERS.map((m) => (
              <button
                key={m.code}
                type="button"
                className="marker-tooltip__btn"
                data-label={m.label}
                onClick={() => handleMarkerSelect(m.code)}
              >
                {m.code}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetDaysColumn;
