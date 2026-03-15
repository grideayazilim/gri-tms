import { useState, useEffect, useCallback, useMemo } from "react";
import { AiOutlineBell } from "react-icons/ai";
import DynamicTable from "../../components/DynamicTable/DynamicTable";
import { timesheetColumns } from "./timesheetColumns";
import { useModal } from "../../components/Modal";
import { useAuth } from "../../context/AuthContext";
import { AnnouncementList } from "../../components/Announcements";
import MarkerSelector from "./MarkerSelector/MarkerSelector";
import { settingsService } from "../../api";
import FilterBar from "../../components/FilterBar/FilterBar";
import PageShell from "../../components/PageShell/PageShell";
import { useFilter } from "../../hooks/data/useFilter";
import { useTimesheets } from "../../hooks/data/useTimesheets";
import { useLocationsAndUnits } from "../../hooks/data/useLocationsAndUnits";
import { useToast } from "../../components/ToastBar/ToastContext";
import { getTimesheetFilterConfig } from "./timesheetFilters";
import { timesheetService } from "../../api";
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
  const { user } = useAuth();
  const { showModal } = useModal();
  const toast = useToast();

  // ── Puantaj verisi ve işlemleri ──────────────────────────────────────────
  const {
    timesheets,
    setTimesheets,
    isLoading,
    isSaving,
    error,
    fetchTimesheets,
    saveTimesheets,
  } = useTimesheets();

  // ── Yerleşke / Birim listeleri (filtre dropdown'ları için) ───────────────
  const {
    locations: apiLocations,
    units: apiUnits,
    fetchLocations,
    fetchUnitsByLocation,
  } = useLocationsAndUnits();

  // ── Marker listesi ─────────────────────────────────────
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    settingsService
      .getMarkers()
      .then((res) => {
        if (res?.data?.markers) {
          setMarkers(res.data.markers);
          // İlk ücretli marker'ı varsayılan seç
          const firstPaid = res.data.markers.find((m) => m.isPaid);
          if (firstPaid) setSelectedMarker(firstPaid.code);
        }
      })
      .catch((err) =>
        console.error("[TimesheetPage] Marker listesi alınamadı:", err),
      );
  }, []);

  // ── Seçili işaretçi ──────────────────────────────────────────────────────
  const [selectedMarker, setSelectedMarker] = useState("");

  // ── Dirty state takibi (kaydet butonu gösterimi + isDayCellDirty) ────────
  const [originalSnapshot, setOriginalSnapshot] = useState([]);

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
  const locationOptions = useMemo(
    () => apiLocations.map((l) => ({ value: l.id, label: l.name })),
    [apiLocations],
  );
  const unitOptions = useMemo(
    () => apiUnits.map((u) => ({ value: u.id, label: u.name })),
    [apiUnits],
  );
  const filterConfig = useMemo(
    () => getTimesheetFilterConfig(periods, locationOptions, unitOptions),
    [periods, locationOptions, unitOptions],
  );

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

  // Dönemler yüklenince en güncel dönemi otomatik seç
  useEffect(() => {
    if (periods.length > 0 && !filters.period) {
      setFilters((prev) => ({ ...prev, period: periods[0].value }));
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
      }
    });
  }, [fetchTimesheets, apiParams]);

  // ─────────────────────────────────────────────────────────────────────────
  // HÜCRE TIKLAMA — tek satırı günceller, totali yeniden hesaplar
  // ─────────────────────────────────────────────────────────────────────────
  const handleDayClick = useCallback(
    (row, day) => {
      // Kilitli dönemde değişiklik yapılmasın
      if (row.isLocked) {
        toast({
          type: "warning",
          message: "Bu dönem kilitlenmiş, değişiklik yapılamaz.",
        });
        return;
      }

      if (!selectedMarker) {
        toast({
          type: "warning",
          message: "Lütfen önce bir işaretçi seçiniz!",
        });
        return;
      }

      setTimesheets((prev) =>
        prev.map((r) => {
          if (r.id !== row.id) return r;

          const dayStr = day.toString().padStart(2, "0");
          const key = `${filters.period}-${dayStr}`;

          const newDays = { ...r.timesheet_days };
          if (newDays[key] === selectedMarker) {
            delete newDays[key];
          } else {
            newDays[key] = selectedMarker;
          }

          // Ücretli marker kodlarını DB'den gelen markers state'inden al
          const paidCodes = new Set(
            markers.filter((m) => m.isPaid).map((m) => m.code),
          );
          const work_days_count = Object.values(newDays).filter((v) =>
            paidCodes.has(v),
          ).length;

          return { ...r, timesheet_days: newDays, work_days_count };
        }),
      );
    },
    [selectedMarker, filters.period, setTimesheets, toast, markers],
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
  // DUYURULAR MODALİ
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenAnnouncements = async () => {
    await showModal({
      title: "Duyurular",
      size: "large",
      content: (onClose) => <AnnouncementList onClose={onClose} />,
    });
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
      title="Puantaj İşaretleme"
      headerActions={headerActions}
      isLoading={isLoading}
    >
      <div className="ts-user-badge">
        <button
          className="announcement-icon-btn"
          onClick={handleOpenAnnouncements}
          title="Duyurular"
        >
          <AiOutlineBell />
        </button>
        <span className="user-info">Kullanıcı: {userName}</span>
      </div>

      {/* Filters */}
      <FilterBar
        config={filterConfig}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      <MarkerSelector
        markers={markers}
        selected={selectedMarker}
        onSelect={setSelectedMarker}
      />

      <DynamicTable
        columns={timesheetColumns(
          currentDaysInMonth,
          handleDayClick,
          isDayCellDirty,
        )}
        data={timesheets}
        loading={isLoading}
        pageSize={10}
      />
    </PageShell>
  );
};

export default TimesheetPage;
