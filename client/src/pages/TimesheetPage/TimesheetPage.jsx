import { useState, useEffect, useCallback, useMemo } from "react";
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
import { usePublicHolidays } from "../../hooks/data/usePublicHolidays";
import { useLocationsAndUnits } from "../../hooks/data/useLocationsAndUnits";
import { useAnnouncements } from "../../hooks/data/useAnnouncements";
import { useToast } from "../../components/ToastBar/ToastContext";
import { getTimesheetFilterConfig } from "./timesheetFilters";
import { timesheetService } from "../../api";
import { PAID_CODES } from "../../constants/markers";
import "../../styles/inputs.scss";
import "./TimesheetPage.scss";

// Ay isimlerini "YYYY-MM" formatından "2025 Ekim" formatına çeviren yardımcı
const MONTH_LABELS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

// DB'den gelen period'u { value, label } formatına dönüştürür
const mapPeriod = (p) => ({
  value: `${p.year}-${String(p.month).padStart(2, "0")}`,
  label: `${p.year} ${MONTH_LABELS[p.month - 1]}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const TimesheetPage = () => {
  const { user, isAdmin } = useAuth();
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
      setShowUnreadTip(true);
      const t = setTimeout(() => setShowUnreadTip(false), 4000);
      return () => clearTimeout(t);
    }
  }, [unreadCount]);

  // ── Puantaj verisi ve işlemleri ──────────────────────────────────────────
  const {
    timesheets,
    setTimesheets,
    isLoading,
    isSaving,
    error,
    fetchTimesheets,
    saveTimesheets,
    toggleLockPeriod,
  } = useTimesheets();

  // ── Yerleşke / Birim listeleri (filtre dropdown'ları için) ───────────────
  const {
    locations: apiLocations,
    units: apiUnits,
    fetchLocations,
    fetchUnitsByLocation,
  } = useLocationsAndUnits();

  // ── Dirty state takibi (kaydet butonu gösterimi + isDayCellDirty) ────────
  const [originalSnapshot, setOriginalSnapshot] = useState([]);

  // ── Dönem kilit durumu (ADMIN tarafından toggle edilir) ─────────────────
  const [periodIsLocked, setPeriodIsLocked] = useState(false);

  // ── Dönem listesi ──────────────────────────────────────
  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    timesheetService
      .getPeriods()
      .then((res) => {
        if (res?.data?.periods) {
          setPeriods(res.data.periods.map(mapPeriod));
        }
      })
      .catch((err) =>
        console.error("[TimesheetPage] Dönemler alınamadı:", err),
      );
  }, []);

  // ── Filtre dropdown seçenekleri ──────────────────────────────────────────
  // API'den gelen { id, name } shape'ini FilterBar'ın beklediği { value, label } shape'ine çevir
  const locationOptions = useMemo(() => {
    const mapped = apiLocations.map((l) => ({ value: l.id, label: l.name }));

    if (!!isAdmin() || !responsibleLocationId) return mapped;

    return mapped.filter(
      (location) => String(location.value) === responsibleLocationId,
    );
  }, [apiLocations, !isAdmin(), responsibleLocationId]);

  const unitOptions = useMemo(() => {
    const mapped = apiUnits.map((u) => ({ value: u.id, label: u.name }));

    if (!!isAdmin() || !responsibleUnitId) return mapped;

    return mapped.filter((unit) => String(unit.value) === responsibleUnitId);
  }, [apiUnits, !isAdmin(), responsibleUnitId]);

  const filterConfig = useMemo(() => {
    const baseConfig = getTimesheetFilterConfig(
      periods,
      locationOptions,
      unitOptions,
    );

    if (!!isAdmin()) return baseConfig;

    return baseConfig.map((field) => {
      if (field.key === "location" || field.key === "unit") {
        const { defaultOption, ...rest } = field;
        return rest;
      }
      return field;
    });
  }, [periods, locationOptions, unitOptions, !isAdmin()]);

  // ── Filtreler ─────────────────────────────────────────────────────────────
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
  const { isPublicHoliday, getHolidayName } = usePublicHolidays(filters.period);

  // Birim sorumlusu için yerleşke/birim filtreleri sabitlenir
  useEffect(() => {
    if (!!isAdmin()) return;

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
  }, [!isAdmin(), responsibleLocationId, responsibleUnitId, setFilters]);

  // Dönemler yüklenince mevcut ayı seç, yoksa listedeki ilk dönemi seç
  useEffect(() => {
    if (periods.length > 0 && !filters.period) {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const match = periods.find((p) => p.value === currentPeriod);
      setFilters((prev) => ({ ...prev, period: match ? match.value : periods[0].value }));
    }
  }, [periods, setFilters, filters.period]);

  // ── Sayfa açılışında yerleşkeleri yükle ──────────────────────────────────
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // ── Seçili yerleşke değişince birimleri yükle ────────────────────────────
  useEffect(() => {
    if (filters.location) {
      fetchUnitsByLocation(filters.location);
    }
    // Yerleşke temizlenince birim filtresini de sıfırla
    if (!filters.location) {
      handleFilterChange("unit", "");
    }
  }, [filters.location, fetchUnitsByLocation, handleFilterChange]);

  useEffect(() => {
    fetchTimesheets(apiParams).then((result) => {
      if (result.success && result.rows) {
        setOriginalSnapshot(JSON.parse(JSON.stringify(result.rows)));
        // İlk satırdan dönemin kilit durumunu al
        const locked = result.rows[0]?.isLocked ?? false;
        setPeriodIsLocked(locked);
      }
    });
  }, [fetchTimesheets, apiParams]);

  // ─────────────────────────────────────────────────────────────────────────
  // HÜCRE TIKLAMA — sol tık: X, sağ tık: diğer işaretçiler (markerCode ile gelir)
  // ─────────────────────────────────────────────────────────────────────────
  const handleDayClick = useCallback(
    (row, day, markerCode) => {
      // Resmi tatilde değişiklik yapılmasın
      if (isPublicHoliday(day)) {
        const holidayName = getHolidayName(day) || "Resmi tatil";
        toast({
          type: "warning",
          message: `${holidayName} — bu gün resmi tatildir, işaretçi girilemez.`,
        });
        return;
      }


      // Kilitli dönemde değişiklik yapılmasın
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

          const dayStr = day.toString().padStart(2, "0");
          const key = `${filters.period}-${dayStr}`;

          const newDays = { ...r.timesheet_days };
          // Aynı marker tekrar tıklanırsa kaldır (toggle)
          if (newDays[key] === markerCode) {
            delete newDays[key];
          } else {
            newDays[key] = markerCode;
          }

          // Sabit ücretli kodlardan toplam hesapla
          const work_days_count = Object.values(newDays).filter((v) =>
            PAID_CODES.has(v),
          ).length;

          return { ...r, timesheet_days: newDays, work_days_count };
        }),
      );
    },
    [filters.period, setTimesheets, toast, isPublicHoliday, getHolidayName],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DİRTY STATE — değişen hücreleri işaretler
  // ─────────────────────────────────────────────────────────────────────────
  const isDayCellDirty = useCallback(
    (rowId, day) => {
      const dayStr = day.toString().padStart(2, "0");
      const key = `${filters.period}-${dayStr}`;

      const originalRow = originalSnapshot.find((r) => r.id === rowId);
      if (!originalRow) return false;

      const originalVal = originalRow.timesheet_days?.[key] ?? "";
      const currentVal =
        timesheets.find((r) => r.id === rowId)?.timesheet_days?.[key] ?? "";

      return originalVal !== currentVal;
    },
    [originalSnapshot, timesheets, filters.period],
  );

  // Herhangi bir satırda değişiklik var mı? (Kaydet butonunu göster/gizle)
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

  // ─────────────────────────────────────────────────────────────────────────
  // KAYDET
  // ─────────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Aktif dönemdeki herhangi bir satırdan periodId alınır;
    // Tüm görünen satırlar aynı period'a ait (filtre gereği)
    const periodId = timesheets.find((r) => r.periodId)?.periodId;

    if (!periodId) {
      toast({ type: "error", message: "Dönem bilgisi bulunamadı." });
      return;
    }

    // Sadece değişen satırları bul ve gönder
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
      setOriginalSnapshot(JSON.parse(JSON.stringify(timesheets)));
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
      const newState = result.data?.isLocked;
      setPeriodIsLocked(newState);
      // Satırlardaki isLocked bilgisini de güncelle
      setTimesheets((prev) =>
        prev.map((r) => ({ ...r, isLocked: newState })),
      );
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
      content: (onClose) => <AnnouncementList onClose={onClose} />,
    });
    fetchUnreadCount(); // Modal kapandıktan sonra okunmamış sayısını güncelle
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER YARDIMCILARI
  // ─────────────────────────────────────────────────────────────────────────
  const getDaysInMonth = (periodStr) => {
    if (!periodStr) return 30;
    const [year, month] = periodStr.split("-");
    return new Date(year, month, 0).getDate();
  };
  const currentDaysInMonth = getDaysInMonth(filters.period);
  const userName = user?.name || user?.username || "Kullanıcı";

  const headerActions = (
    <>
      {hasGlobalChanges && (
        <button
          className="btn btn--primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
        </button>
      )}
    </>
  );

  return (
    <PageShell
      title={"Puantaj İşaretleme"}
      headerActions={headerActions}
      isLoading={isLoading}
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

      {/* Filters */}
      <FilterBar
        config={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Dönem kilitleme — sadece ADMIN görür */}
      {isAdmin() && (
        <div className="ts-lock-row">
          <label className="ts-lock-row__label">
            <input
              type="checkbox"
              checked={periodIsLocked}
              onChange={handleToggleLock}
            />
            <span>Veri Girişini Kilitle</span>
          </label>
        </div>
      )}

      <DynamicTable
        columns={timesheetColumns(
          currentDaysInMonth,
          handleDayClick,
          isDayCellDirty,
          filters.period,
          isPublicHoliday,
        )}
        data={timesheets}
        loading={isLoading}
        pageSize={10}
      />
    </PageShell>
  );
};

export default TimesheetPage;
