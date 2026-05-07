/* ========================================================================
   TIMESHEET PAGE (PUANTAJ YÖNETİM SAYFASI)
   Uygulamanın ana işlem merkezi. Veri girişi, filtreleme ve kilit yönetimi.
   ======================================================================== */
import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { AiOutlineBell } from "react-icons/ai";
import DynamicTable from "../../components/DynamicTable/DynamicTable";
import { timesheetColumns } from "./timesheetColumns";
import { useModal } from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";
import { AnnouncementList } from "../../components/Announcements";
import FilterBar from "../../components/FilterBar/FilterBar";
import PageShell from "../../components/PageShell/PageShell";
import { useFilter } from "../../hooks/data/useFilter";
import { useTimesheets } from "../../hooks/data/useTimesheets";
import type { TimesheetUIRow } from "../../hooks/data/useTimesheets";
import { usePublicHolidays } from "../../hooks/data/usePublicHolidays";
import { useLocationsAndUnits } from "../../hooks/data/useLocationsAndUnits";
import { useAnnouncements } from "../../hooks/data/useAnnouncements";
import { useToast } from "../../components/ToastBar/useToast";
import { getTimesheetFilterConfig } from "./timesheetFilters";
import { PAID_CODES } from "@timesheet/shared";
import "../../styles/inputs.scss";
import "./TimesheetPage.scss";


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TimesheetPage = () => {
  const { user, isAdmin } = useAuth();
  const isAdminUser = isAdmin;
  const responsibleLocationId = user?.locationId ? String(user.locationId) : "";
  const responsibleUnitId = user?.unitId ? String(user.unitId) : "";
  const { showModal } = useModal();
  const toast = useToast();
  const { unreadCount, fetchUnreadCount } = useAnnouncements();

  // ── Okunmamış duyuru sayacı ve giriş tooltip'i ─────────────────────────
  const [showUnreadTip, setShowUnreadTip] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Sayfa ilk açıldığında okunmamış duyuru varsa birkaç saniye tooltip göster
  useEffect(() => {
    if (unreadCount > 0) {
      const showTimer = setTimeout(() => setShowUnreadTip(true), 0);
      const hideTimer = setTimeout(() => setShowUnreadTip(false), 4000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [unreadCount]);

  const PAGE_LIMIT = 10;
  const [page, setPage] = useState(1);

  // ── Puantaj verisi ve işlemleri ──────────────────────────────────────────
  const {
    timesheets,
    setTimesheets,
    pagination,
    isLoading,
    isSaving,
    isLocking,
    error,
    fetchTimesheets,
    saveTimesheets,
    toggleLockPeriod,
    periods,
    fetchPeriods,
  } = useTimesheets();

  // ── Yerleşke / Birim listeleri (filtre dropdown'ları için) ───────────────
  const {
    locations: apiLocations,
    units: apiUnits,
    fetchLocations,
    fetchUnitsByLocation,
  } = useLocationsAndUnits();

  // ── Dirty state takibi ──────────────────────────────────────────
  // Veritabanından gelen ilk hali burada tutulur; tabloda değişiklik 
  // yapıldığında bu snapshot ile kıyaslanarak "Kaydet" butonu gösterilir.
  const [originalSnapshot, setOriginalSnapshot] = useState<TimesheetUIRow[]>([]);


  // ── Dönem kilit durumu (ADMIN tarafından toggle edilir) ─────────────────
  const [periodIsLocked, setPeriodIsLocked] = useState(false);

  // ── Dönem listesi ──────────────────────────────────────
  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  // ── Filtre dropdown seçenekleri ──────────────────────────────────────────
  const locationOptions = useMemo(() => {
    const mapped = apiLocations.map((l) => ({ value: l.id, label: l.name }));
    if (isAdminUser || !responsibleLocationId) return mapped;
    return mapped.filter((l) => String(l.value) === responsibleLocationId);
  }, [apiLocations, isAdminUser, responsibleLocationId]);

  const unitOptions = useMemo(() => {
    const mapped = apiUnits.map((u) => ({ value: u.id, label: u.name }));
    if (isAdminUser || !responsibleUnitId) return mapped;
    return mapped.filter((u) => String(u.value) === responsibleUnitId);
  }, [apiUnits, isAdminUser, responsibleUnitId]);

  const filterConfig = useMemo(
    () => getTimesheetFilterConfig(periods, locationOptions, unitOptions, isAdminUser),
    [periods, locationOptions, unitOptions, isAdminUser],
  );

  // ── Filtreler ─────────────────────────────────────────────────────────────
  // useFilter hook'u, filtre değerlerini ve backend'e gidecek apiParams'ı yönetir.
  const { filters, apiParams, handleFilterChange, setFilters } = useFilter(
    filterConfig,
    {
      period: "",
      location: "",
      unit: "",
      search: "",
    },
  );


  // ── Resmi tatiller ──────────────────────────────────────────────────────
  const { isPublicHoliday, getHolidayName } = usePublicHolidays(filters.period || "");

  // Birim sorumlusu için yerleşke/birim filtreleri login olduğu bilgilere sabitlenir.
  // Bu sayede sorumlu kişi başka birimin verisine erişemez.
  useEffect(() => {
    if (isAdminUser) return;

    setFilters((prev) => {
      const nextLocation = responsibleLocationId || prev.location;
      const nextUnit = responsibleUnitId || prev.unit;

      if (prev.location === nextLocation && prev.unit === nextUnit) {
        return prev;
      }

      return {
        ...prev,
        location: nextLocation,
        unit: nextUnit,
      };
    });
  }, [isAdminUser, responsibleLocationId, responsibleUnitId, setFilters]);


  // Dönemler yüklenince mevcut ayı seç, yoksa listedeki ilk dönemi seç
  useEffect(() => {
    if (periods.length > 0 && !filters.period) {
      const currentPeriod = format(new Date(), "yyyy-MM");
      const match = periods.find((p) => p.value === currentPeriod);
      setTimeout(() => {
        setFilters((prev) => ({
          ...prev,
          period: match ? match.value : (periods[0]?.value || ""),
        }));
      }, 0);
    }
  }, [periods, setFilters, filters.period]);

  // Filtreler değişince sayfayı başa sar
  useEffect(() => {
    setTimeout(() => setPage(1), 0);
  }, [apiParams]);

  // ── Sayfa açılışında yerleşkeleri yükle ──────────────────────────────────
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // ── Seçili yerleşke değişince birimleri yükle ────────────────────────────
  useEffect(() => {
    if (filters.location) {
      fetchUnitsByLocation(filters.location);
    }
    if (!filters.location) {
      handleFilterChange("unit", "");
    }
  }, [filters.location, fetchUnitsByLocation, handleFilterChange]);

  useEffect(() => {
    if (!apiParams.month) return;

    fetchTimesheets({ ...apiParams, page, limit: PAGE_LIMIT }).then((result) => {
      if (result.success && result.data?.rows) {
        setOriginalSnapshot(structuredClone(result.data.rows));
        const locked = result.data.rows[0]?.isLocked ?? false;
        setPeriodIsLocked(locked);
      }
    }).catch(() => {
      // fetchTimesheets kendi catch bloğunda hata state'ini set ediyor
    });
  }, [fetchTimesheets, apiParams, page]);

  // ─────────────────────────────────────────────────────────────────────────
  // HÜCRE TIKLAMA
  // ─────────────────────────────────────────────────────────────────────────
  const handleDayClick = useCallback(
    (row: TimesheetUIRow, dateStr: string, markerCode: string) => {
      if (isPublicHoliday(dateStr)) {
        const holidayName = getHolidayName(dateStr) || "Resmi tatil";
        toast({
          type: "warning",
          message: `${holidayName} — bu gün resmi tatildir, işaretçi girilemez.`,
        });
        return;
      }

      if (row.isLocked) {
        toast({
          type: "warning",
          message: "Bu dönem kilitlenmiş, değişiklik yapılamaz.",
        });
        return;
      }

      setTimesheets((prev) =>
        prev.map((r) => {
          if (r.id !== row.id) return r;

          const newDays = { ...r.timesheet_days };
          // Eğer hücrede zaten aynı işaretçi varsa sil (toggle), yoksa yeni işaretçiyi yaz
          if (newDays[dateStr] === markerCode) {
            delete newDays[dateStr];
          } else {
            newDays[dateStr] = markerCode;
          }

          // Güncel fiili çalışma gün sayısını anlık hesapla (PAID_CODES üzerinden)
          const workDaysCount = Object.values(newDays).filter((v) =>
            PAID_CODES.has(v),
          ).length;

          return { ...r, timesheet_days: newDays, workDaysCount };
        }),
      );
    },

    [setTimesheets, toast, isPublicHoliday, getHolidayName],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DİRTY STATE
  // ─────────────────────────────────────────────────────────────────────────
  const hasGlobalChanges = useMemo(
    () =>
      timesheets.some((r) => {
        const original = originalSnapshot.find((o) => o.id === r.id);
        if (!original) return false;
        return (
          JSON.stringify(r.timesheet_days ?? {}) !==
          JSON.stringify(original.timesheet_days ?? {})
        );
      }),
    [timesheets, originalSnapshot],
  );

  const handlePageChange = (newPage: number) => {
    // Sayfa değiştirirken kaydedilmemiş veri kaybını önlemek için bloklama yapıyoruz.
    if (hasGlobalChanges) {
      toast({
        type: "warning",
        message: "Kaydedilmemiş değişiklikleriniz var. Lütfen önce kaydedin veya değişiklikleri geri alın.",
      });
      return;
    }
    setPage(newPage);
  };


  // ─────────────────────────────────────────────────────────────────────────
  // KAYDET
  // ─────────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const periodId = timesheets.find((r) => r.periodId)?.periodId;

    if (!periodId) {
      toast({ type: "error", message: "Dönem bilgisi bulunamadı." });
      return;
    }

    const dirtyRows = timesheets.filter((r) => {
      const original = originalSnapshot.find((o) => o.id === r.id);
      if (!original) return true;
      return (
        JSON.stringify(r.timesheet_days ?? {}) !==
        JSON.stringify(original.timesheet_days ?? {})
      );
    });

    const result = await saveTimesheets(periodId, dirtyRows);

    if (result.success) {
      toast({ type: "success", message: "Puantaj başarıyla kaydedildi." });
      setOriginalSnapshot(structuredClone(timesheets));
    } else {
      toast({
        type: "error",
        message: result.error || "Puantaj kaydedilemedi.",
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DÖNEM KİLİTLEME / AÇMA (sadece ADMIN)
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleLock = async () => {
    const periodId = timesheets.find((r) => r.periodId)?.periodId;
    if (!periodId) return;

    const result = await toggleLockPeriod(periodId);
    if (result.success) {
      // Sunucu { isLocked: boolean } döndürür, period wrapper'ı yoktur
      const newState = (result.data as { isLocked?: boolean })?.isLocked ?? !periodIsLocked;
      setPeriodIsLocked(newState);
      setTimesheets((prev) => prev.map((r) => ({ ...r, isLocked: newState })));
      toast({
        type: "success",
        message: newState
          ? "Dönem kilitlendi — veri girişi engellendi."
          : "Dönem kilidi açıldı — veri girişi serbest.",
      });
    } else {
      toast({
        type: "error",
        message: result.error || "Kilit durumu değiştirilemedi.",
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DUYURULAR MODALİ
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenAnnouncements = async () => {
    await showModal({
      title: "Duyurular",
      size: "large",
      content: (onClose) => <AnnouncementList onClose={() => onClose(undefined)} />,
    });
    fetchUnreadCount();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER YARDIMCILARI
  // ─────────────────────────────────────────────────────────────────────────
  const activePeriod = useMemo(() => {
    return periods.find((p) => p.value === filters.period) || null;
  }, [periods, filters.period]);

  const periodDays = useMemo(() => {
    if (!activePeriod || !activePeriod.startDate || !activePeriod.endDate) {
      if (!filters.period) return [];
      const [year, month] = filters.period.split("-");
      const d = new Date(Number(year), Number(month), 0).getDate();
      return Array.from({ length: d }, (_, i) => `${year}-${month}-${String(i + 1).padStart(2, "0")}`);
    }
    try {
      const start = parseISO(activePeriod.startDate);
      const end = parseISO(activePeriod.endDate);
      return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
    } catch {
      return [];
    }
  }, [activePeriod, filters.period]);

  const columns = useMemo(
    () => timesheetColumns(periodDays, handleDayClick, originalSnapshot, filters.period as string, isPublicHoliday),
    [periodDays, handleDayClick, originalSnapshot, filters.period, isPublicHoliday],
  );

  const userName = user?.username || "Kullanıcı";

  const headerActions = (
    <AnimatePresence>
      {(hasGlobalChanges || isSaving) && (
        <motion.div
          key="save"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <button className="btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <PageShell
      title={"Puantaj İşaretleme"}
      headerActions={headerActions}
      isLoading={isLoading}
      infoVideos={{
        modalTitle: 'Puantaj Nasıl Kullanılır?',
        byRole: {
          ADMIN: [
            { src: 'https://www.w3schools.com/html/mov_bbb.mp4', title: 'Puantaj - Admin 1' },
            { src: 'https://www.w3schools.com/html/movie.mp4', title: 'Puantaj - Admin 2' },
          ],
          RESPONSIBLE: [
            { src: 'https://www.w3schools.com/html/mov_bbb.mp4', title: 'Puantaj - Sorumlu' },
          ],
        },
      }}
    >
      <div className="ts-user-badge">
        <button
          className={`announcement-icon-btn${unreadCount > 0 ? " announcement-icon-btn--has-unread" : ""}`}
          onClick={handleOpenAnnouncements}
          title="Duyurular"
        >
          {unreadCount > 0 && <span className="announcement-pulse" />}
          <AiOutlineBell />
          {unreadCount > 0 && (
            <span className="announcement-badge">{unreadCount}</span>
          )}
        </button>
        {showUnreadTip && (
          <span className="unread-tooltip">
            {unreadCount} okunmamış duyurunuz var
          </span>
        )}
        <span className="user-info">Kullanıcı: {userName}</span>
      </div>

      {error && (
        <div style={{
          color: "#dc2626",
          fontSize: "13px",
          padding: "8px 12px",
          background: "rgba(239,68,68,0.08)",
          borderRadius: "6px",
          marginBottom: "8px",
        }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <FilterBar
        config={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Dönem kilitleme — sadece ADMIN görür */}
      {isAdminUser && (
        <div className="ts-lock-row">
          <label className="ts-lock-row__label">
            <input
              type="checkbox"
              checked={periodIsLocked}
              onChange={handleToggleLock}
              disabled={isLocking}
            />
            <span>{isLocking ? "İşleniyor..." : "Veri Girişini Kilitle"}</span>
          </label>
        </div>
      )}

      <DynamicTable
        columns={columns}
        data={timesheets}
        loading={isLoading}
        {...(pagination != null ? { pagination } : {})}
        onPageChange={handlePageChange}
      />
    </PageShell>
  );
};

export default TimesheetPage;
