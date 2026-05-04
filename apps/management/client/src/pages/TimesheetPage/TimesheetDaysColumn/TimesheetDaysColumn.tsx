/* ========================================================================
   TIMESHEET DAYS COLUMN (GÜN HÜCRELERİ BİLEŞENİ)
   Tablodaki her bir çalışanın ay bazındaki gün hücrelerini render eder.
   Tıklama (Sol), Sağ Tık (Context Menu) ve Uzun Basma (Mobil) destekler.
   ======================================================================== */
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { MARKER_LIST, MARKERS } from "@timesheet/shared";
import "./TimesheetDaysColumn.scss";


const getDayValue = (timesheetDays: Record<string, string>, dateStr: string) => {
  if (!timesheetDays || !dateStr) return "";
  return timesheetDays[dateStr] || "";
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

// X dışındaki işaretçiler — sağ tık / long press menüsünde gösterilir
const OTHER_MARKERS = MARKER_LIST.filter((m) => m.code !== MARKERS.X.code);

/**
 * Bir satırdaki tüm gün hücrelerini render eden sütun bileşeni.
 *
 * @param {object}   timesheetDays   - { "2026-02-05": "X", ... }
 * @param {string[]} periodDays      - periyottaki günlerin array'i
 * @param {string}   period          - YYYY-MM
 * @param {function} onDayClick      - (dateStr, markerCode) => void
 * @param {function} isDayCellDirty  - (dateStr) => boolean — opsiyonel
 * @param {function} isPublicHoliday - (dateStr) => boolean — opsiyonel
 */
interface TimesheetDaysColumnProps {
  period?: string;
  timesheetDays: Record<string, string>;
  periodDays: string[];
  onDayClick: (dateStr: string, markerCode: string) => void;
  isDayCellDirty?: (dateStr: string) => boolean;
  isPublicHoliday?: (dateStr: string) => boolean;
  isLocked?: boolean;
}

const TimesheetDaysColumn = ({
  period: _period,
  timesheetDays,
  periodDays,
  onDayClick,
  isDayCellDirty,
  isPublicHoliday,
  isLocked,
}: TimesheetDaysColumnProps) => {
  // ── Sağ tık / long press menü state ────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ day: string, centerX: number, y: number, showDate: boolean } | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuLeaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressTriggered = useRef(false);

  // ── Hover tooltip state (react-tooltip yerine) ────────────────────────
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoverClosing, setHoverClosing] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Unmount'ta tüm timer'ları temizle — memory leak önlemi
  useEffect(() => {
    return () => {
      clearTimeout(longPressTimer.current);
      clearTimeout(menuLeaveTimer.current);
      clearTimeout(hoverTimer.current);
      clearTimeout(hoverCloseTimer.current);
    };
  }, []);

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

  // ── Tarih bilgisi formatı ──────────────────────────────────────────────
  const getDateTooltip = useCallback(
    (dateStr: string) => {
      if (!dateStr) return "";
      try {
        const date = parseISO(dateStr);
        // Örn: "5 Şubat Çarşamba — 2025"
        return format(date, "d MMMM EEEE — yyyy", { locale: tr });
      } catch {
        return dateStr;
      }
    },
    [],
  );


  // ── Sağ tık — marker menüsü aç (desktop) ──────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, dateStr: string) => {
    e.preventDefault();
    // Kilitli dönemlerde veya resmi tatillerde menü açılmaz
    if (isLocked || isPublicHoliday?.(dateStr)) return;

    // Hover tooltip'i varsa temizle
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);
    setHoverClosing(false);

    const rect = e.currentTarget.getBoundingClientRect();
    setMenuClosing(false);
    setContextMenu({
      day: dateStr,
      centerX: rect.left + rect.width / 2,
      y: rect.bottom + 8,
      showDate: false,
    });
  };


  // ── Mobil Uzun Basma (Long Press) Yönetimi ───────────────────────────
  const handleTouchStart = (e: React.TouchEvent, dateStr: string) => {
    longPressTriggered.current = false;
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);
    setHoverClosing(false);

    const rect = e.currentTarget.getBoundingClientRect();

    // 500ms basılı tutulursa sağ tık menüsünü aç
    longPressTimer.current = setTimeout(() => {
      if (isLocked || isPublicHoliday?.(dateStr)) return;
      longPressTriggered.current = true;
      setMenuClosing(false);
      setContextMenu({
        day: dateStr,
        centerX: rect.left + rect.width / 2,
        y: rect.bottom + 8,
        showDate: true, // Mobilde tarih bilgisini menü içinde de göster
      });
    }, 500);
  };


  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  const handleTouchMove = () => {
    clearTimeout(longPressTimer.current);
  };

  // Sol tık — Eğer long press tetiklendiyse tıklamayı (X işaretlemeyi) yoksay
  const handleClick = (dateStr: string) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    clearTimeout(hoverCloseTimer.current);
    clearTimeout(hoverTimer.current);
    setHoverDay(null);
    setHoverClosing(false);
    // Sol tık varsayılan olarak 'X' (Fiili Çalışma) işaretler
    onDayClick(dateStr, MARKERS.X.code);
  };


  // ── Hover tooltip işlemleri ──────────────────────────────────────────────
  const handleMouseEnter = (e: React.MouseEvent, dateStr: string) => {
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
      setHoverDay(dateStr);
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
  const handleMarkerSelect = (markerCode: string) => {
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
      {(periodDays || []).map((dateStr) => {
        const day = dateStr ? parseInt(dateStr.split("-")[2] ?? '', 10) : 0;
        const value = getDayValue(timesheetDays, dateStr);
        const dirty = isDayCellDirty ? isDayCellDirty(dateStr) : false;
        const isWeekend = isWeekendDay(dateStr);
        const isHoliday = isPublicHoliday ? isPublicHoliday(dateStr) : false;

        return (
          <button
            key={dateStr}
            type="button"
            className={[
              "ts-day-cell",
              value ? "ts-day-cell--marked" : "",
              isWeekend ? "ts-day-cell--weekend" : "",
              dirty ? "ts-day-cell--dirty" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onMouseEnter={(e) => handleMouseEnter(e, dateStr)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(dateStr)}
            onContextMenu={(e) => handleContextMenu(e, dateStr)}
            onTouchStart={(e) => handleTouchStart(e, dateStr)}
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
                  transition={{ duration: 0.25, ease: "linear" }}
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
