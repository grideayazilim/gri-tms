/* ========================================================================
   LOCATIONS PAGE (YERLEŞKE VE BİRİM YÖNETİMİ)
   Hiyerarşik bir yapıda (Yerleşke > Birim) veri yönetimini sağlar.
   Staged Deletion (Önce silme işaretle, sonra kaydet) ve Undo desteği sunar.
   ======================================================================== */
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RiDeleteBinLine, RiArrowRightSLine, RiFileExcel2Line, RiRobot2Line, RiArrowGoBackLine, RiMore2Fill } from "react-icons/ri";
import "../../styles/inputs.scss";
import PageShell from "../../components/PageShell/PageShell";
import { getPeriods } from "../../api/timesheetService";
import { downloadTimesheetExcel, downloadBotExcel } from "../../api/exportService";
import { useToast } from "../../components/ToastBar/useToast";
import "./LocationsPage.scss";

import { TURKISH_MONTHS } from "../../utils/dateUtils";
import { useOnClickOutside } from "../../hooks/ui/useOnClickOutside";
import { useLocationSync } from "./useLocationSync";
import type { LocationData } from "./useLocationSync";

interface ExportPanelState {
  locationId: number | string;
  locationName: string;
  type: "timesheet" | "bot";
}

interface PeriodData {
  id: number | string;
  year: number;
  month: number;
}

function LocationsPage() {
  const {
    locations,
    isLoading,
    isSaving,
    deletedLocationIds,
    deletedUnitIds,
    expandedLocations,
    hasUnsavedChanges,
    toggleLocationCollapse,
    handleLocationChange,
    addLocation,
    removeLocation,
    undoLocation,
    handleUnitChange,
    addUnit,
    removeUnit,
    undoUnit,
    handleSave,
    isLocationDirty,
    isUnitDirty,
  } = useLocationSync();

  const [exportPanel, setExportPanel] = useState<ExportPanelState | null>(null);
  const [exportPeriodId, setExportPeriodId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [periods, setPeriods] = useState<PeriodData[]>([]);
  const [mobileMenuId, setMobileMenuId] = useState<number | string | null>(null);

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const exportPanelRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Periods are fetched once for export; they don't affect location sync state
  useEffect(() => {
    void getPeriods().then((res) => {
      if (!res.success) return;
      const fetched: PeriodData[] = [...res.data.periods].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });
      setPeriods(fetched);
      const currentM = new Date().getMonth() + 1;
      const currentY = new Date().getFullYear();
      const current = fetched.find((p) => p.month === currentM && p.year === currentY);
      setExportPeriodId(String(current ? current.id : (fetched[0]?.id ?? '')));
    });
  }, []);

  useOnClickOutside(exportPanelRef, () => setExportPanel(null), !!exportPanel);
  useOnClickOutside(mobileMenuRef, () => setMobileMenuId(null), !!mobileMenuId);

  const openExportPanel = (location: LocationData, type: "timesheet" | "bot") => {
    if (location.isNew) {
      toast({ type: "error", message: "Önce değişiklikleri kaydedin" });
      return;
    }
    setExportPanel({ locationId: location.id, locationName: location.name, type });
  };

  const handleExport = async () => {
    if (!exportPanel || !exportPeriodId) {
      toast({ type: "error", message: "Lütfen bir periyod seçin" });
      return;
    }
    const selectedPeriod = periods.find((p) => String(p.id) === String(exportPeriodId));
    if (!selectedPeriod) {
      toast({ type: "error", message: "Seçilen periyod bulunamadı" });
      return;
    }

    setIsExporting(true);
    try {
      const params = {
        locationId: String(exportPanel.locationId),
        year: selectedPeriod.year,
        month: selectedPeriod.month,
        locationName: exportPanel.locationName,
      };

      if (exportPanel.type === "timesheet") {
        await downloadTimesheetExcel(params);
      } else {
        await downloadBotExcel(params);
      }

      setExportPanel(null);
      toast({ type: "success", message: "Excel başarıyla indirildi" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Excel oluşturulurken hata oluştu";
      toast({ type: "error", message: msg });
    } finally {
      setIsExporting(false);
    }
  };

  const headerActions = (
    <AnimatePresence>
      {hasUnsavedChanges && (
        <motion.div
          key="save"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <button type="button" className="btn" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (isLoading) {
    return (
      <PageShell title="Yerleşke ve Birimler">
        <div className="loading-container">
          <div className="loader">Yükleniyor...</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Yerleşke ve Birimler" headerActions={headerActions}>
      <div className="locations-warning">
        <strong>Uyarı:</strong> Bir yerleşke veya birimi sildiğinizde, ilgili oluşuma ait tüm çalışanlar, puantaj verileri ve sistem sorumluları da <strong>kalıcı olarak silinir</strong>.
      </div>
      <div className={`locations-tree${locations.length > 0 ? ' has-locations' : ''}`}>
        <div className="tree-root-line" />

        {locations.map((location) => {
          const isExpanded = expandedLocations.includes(location.id);
          const isPanelOpen = exportPanel?.locationId === location.id;

          return (
            <div key={location.id} className={`tree-node location-node ${!isExpanded ? 'is-collapsed' : ''}`}>
              {/* LEVEL 1: YERLEŞKE */}
              <div className="node-row location-row">
                <button
                  type="button"
                  className={`toggle-btn ${isExpanded ? 'is-expanded' : ''}`}
                  onClick={() => toggleLocationCollapse(location.id)}
                  title={isExpanded ? "Gizle" : "Genişlet"}
                >
                  <RiArrowRightSLine />
                </button>

                <div className="location-inputs">
                  <div className="floating-group floating-group--on-background">
                    <input
                      id={`loc-name-${location.id}`}
                      type="text"
                      className={`input ${deletedLocationIds.includes(location.id) ? 'is-deleted' : (isLocationDirty(location) ? 'is-dirty' : '')}`}
                      placeholder=" "
                      value={location.name}
                      onChange={(e) => handleLocationChange(location.id, "name", e.target.value)}
                      disabled={deletedLocationIds.includes(location.id)}
                    />
                    <label className="floating-group__label">Yerleşke Adı</label>
                  </div>

                  <div className="floating-group floating-group--on-background">
                    <input
                      id={`loc-program-${location.id}`}
                      type="text"
                      className={`location-no-input input ${deletedLocationIds.includes(location.id) ? 'is-deleted' : (isLocationDirty(location) ? 'is-dirty' : '')}`}
                      placeholder=" "
                      value={location.programNo}
                      onChange={(e) => handleLocationChange(location.id, "programNo", e.target.value)}
                      disabled={deletedLocationIds.includes(location.id)}
                    />
                    <label className="floating-group__label">Program No</label>
                  </div>
                </div>

                {deletedLocationIds.includes(location.id) ? (
                  <button
                    type="button"
                    className="btn btn--secondary btn--icon-only"
                    onClick={() => undoLocation(location.id)}
                    title="Geri Al"
                  >
                    <RiArrowGoBackLine />
                  </button>
                ) : (
                  <>
                    <div className="location-actions-desktop">
                      <div className="export-btn-group" ref={isPanelOpen ? exportPanelRef : null}>
                        <button
                          type="button"
                          className="btn btn--export-excel btn--icon-only"
                          onClick={() => openExportPanel(location, "timesheet")}
                          title="Puantaj Export Al"
                        >
                          <RiFileExcel2Line />
                        </button>
                        <button
                          type="button"
                          className="btn btn--export-bot btn--icon-only"
                          onClick={() => openExportPanel(location, "bot")}
                          title="Bot İçin Export Al"
                        >
                          <RiRobot2Line />
                        </button>

                        {isPanelOpen && (
                          <div className="export-panel">
                            <p className="export-panel__title">DÖNEM SEÇİNİZ</p>
                            <div className="export-panel__selects">
                              <select
                                className="export-select"
                                value={exportPeriodId}
                                onChange={(e) => setExportPeriodId(e.target.value)}
                              >
                                {periods.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {TURKISH_MONTHS[p.month - 1]} {p.year}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="btn export-panel__download-btn"
                              onClick={() => void handleExport()}
                              disabled={isExporting}
                            >
                              {isExporting ? "İndiriliyor..." : "İndir"}
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn btn--danger btn--icon-only"
                        onClick={() => removeLocation(location)}
                        title="Yerleşkeyi Sil"
                      >
                        <RiDeleteBinLine />
                      </button>
                    </div>

                    <div className="location-actions-mobile" ref={mobileMenuId === location.id ? mobileMenuRef : null}>
                      <button
                        type="button"
                        className="btn btn--icon-only"
                        onClick={() => setMobileMenuId(mobileMenuId === location.id ? null : location.id)}
                        title="Seçenekler"
                      >
                        <RiMore2Fill />
                      </button>

                      {mobileMenuId === location.id && (
                        <div className="mobile-action-menu">
                          <button type="button" className="mobile-action-menu__item" onClick={(e) => { e.stopPropagation(); openExportPanel(location, "timesheet"); setMobileMenuId(null); }}>
                            <RiFileExcel2Line size={16} /> Puantaj Çıktısı Al
                          </button>
                          <button type="button" className="mobile-action-menu__item" onClick={(e) => { e.stopPropagation(); openExportPanel(location, "bot"); setMobileMenuId(null); }}>
                            <RiRobot2Line size={16} /> Bot Çıktısı Al
                          </button>
                          <button type="button" className="mobile-action-menu__item mobile-action-menu__item--danger" onClick={(e) => { e.stopPropagation(); removeLocation(location); setMobileMenuId(null); }}>
                            <RiDeleteBinLine size={16} /> Yerleşkeyi Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* LEVEL 2: BİRİMLER */}
              <div className={`node-children-wrapper ${isExpanded ? 'is-expanded' : ''}`}>
                <div className="node-children-inner">
                  <div className="node-children">
                    {location.units.map((unit) => (
                      <div key={unit.id} className="tree-node unit-node">
                        <div className="node-row unit-row">
                          <div className="floating-group floating-group--on-background">
                            <input
                              id={`unit-name-${unit.id}`}
                              type="text"
                              className={`input ${(deletedLocationIds.includes(location.id) || deletedUnitIds.includes(unit.id)) ? 'is-deleted' : (isUnitDirty(location.id, unit) ? 'is-dirty' : '')}`}
                              placeholder=" "
                              value={unit.name}
                              onChange={(e) => handleUnitChange(location.id, unit.id, e.target.value)}
                              disabled={deletedLocationIds.includes(location.id) || deletedUnitIds.includes(unit.id)}
                            />
                            <label className="floating-group__label">Birim Adı</label>
                          </div>

                          {deletedUnitIds.includes(unit.id) ? (
                            <button
                              type="button"
                              className="btn btn--secondary btn--icon-only"
                              onClick={() => undoUnit(unit.id)}
                              title="Geri Al"
                            >
                              <RiArrowGoBackLine />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--danger btn--icon-only"
                              onClick={() => removeUnit(location.id, unit)}
                              title="Birimi Sil"
                              disabled={deletedLocationIds.includes(location.id)}
                            >
                              <RiDeleteBinLine />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className={`add-btn add-unit-btn${location.units.length > 0 ? ' has-units' : ''}`}
                      onClick={() => addUnit(location.id)}
                    >
                      + Yeni Birim Ekle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="add-btn add-location-btn"
          onClick={addLocation}
        >
          + Yeni Yerleşke Ekle
        </button>
      </div>
    </PageShell>
  );
}

export default LocationsPage;
