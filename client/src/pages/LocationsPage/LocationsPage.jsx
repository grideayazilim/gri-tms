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
import * as locationService from "../../api/locationAndUnitService";
import { getPeriods } from "../../api/timesheetService";
import { downloadTimesheetExcel, downloadSimpleExcel, downloadBotExcel } from "../../api/exportService";
import { useToast } from "../../components/ToastBar/ToastContext";
import "./LocationsPage.scss";

import { TURKISH_MONTHS } from "../../utils/dateUtils";
import { useOnClickOutside } from "../../hooks/ui/useOnClickOutside";


function LocationsPage() {
  // === STATE ===
  const [locations, setLocations] = useState([]);
  // Değişiklik takibi (Dirty check) için verinin ilk halini tutar
  const [initialLocations, setInitialLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Silinmek üzere işaretlenen ama henüz sunucuya gönderilmeyen ID listeleri
  const [deletedLocationIds, setDeletedLocationIds] = useState([]);
  const [deletedUnitIds, setDeletedUnitIds] = useState([]);
  const [expandedLocations, setExpandedLocations] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [focusElementId, setFocusElementId] = useState(null);


  // Export panel state: { locationId, locationName, type: 'simple'|'puantaj' } | null
  const [exportPanel, setExportPanel] = useState(null);
  const [exportPeriodId, setExportPeriodId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [mobileMenuId, setMobileMenuId] = useState(null);
  const mobileMenuRef = useRef(null);

  const exportPanelRef = useRef(null);
  const toast = useToast();

  // === FETCH DATA ===
  useEffect(() => {
    fetchData();
  }, []);

  // Close export panel / mobile menu on outside click
  useOnClickOutside(exportPanelRef, () => setExportPanel(null), !!exportPanel);
  useOnClickOutside(mobileMenuRef, () => setMobileMenuId(null), !!mobileMenuId);

  // Auto-focus on recently added inputs
  useEffect(() => {
    if (focusElementId) {
      const el = document.getElementById(focusElementId);
      if (el) {
        el.focus();
        setFocusElementId(null);
      }
    }
  }, [locations, expandedLocations, focusElementId]);

  // === TOGGLE EXPAND ===
  const toggleLocationCollapse = (id) => {
    setExpandedLocations((prev) =>
      prev.includes(id) ? prev.filter((locId) => locId !== id) : [...prev, id]
    );
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [locRes, unitRes, periodRes] = await Promise.all([
        locationService.getLocations(),
        locationService.getUnits(),
        getPeriods()
      ]);

      const locs = locRes.data?.locations || [];
      const allUnits = unitRes.data?.units || [];
      const fetchedPeriods = periodRes.data?.periods || [];

      fetchedPeriods.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      setPeriods(fetchedPeriods);
      if (fetchedPeriods.length > 0) {
        const currentM = new Date().getMonth() + 1;
        const currentY = new Date().getFullYear();
        const currentPeriod = fetchedPeriods.find(p => p.month === currentM && p.year === currentY);
        setExportPeriodId(String(currentPeriod ? currentPeriod.id : fetchedPeriods[0].id));
      }

      const enrichedLocations = locs.map(loc => ({
        ...loc,
        units: allUnits.filter(u => u.locationId === loc.id)
      }));

      setLocations(enrichedLocations);
      setInitialLocations(JSON.parse(JSON.stringify(enrichedLocations)));
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({ type: "error", message: "Veriler yüklenirken bir hata oluştu" });
    } finally {
      setIsLoading(false);
    }
  };

  // === HANDLERS ===
  const handleLocationChange = (id, field, value) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, [field]: value } : loc)),
    );
  };

  const addLocation = () => {
    const newId = Date.now();
    setLocations((prev) => [...prev, { id: newId, isNew: true, name: "", programNo: "", units: [] }]);
    setExpandedLocations((prev) => [...prev, newId]);
    setFocusElementId(`loc-name-${newId}`);
  };

  const removeLocation = (loc) => {
    // Eğer yeni eklenmişse (henüz DB'de yoksa) direkt listeden sil
    if (loc.isNew) {
      setLocations((prev) => prev.filter((l) => l.id !== loc.id));
      setExpandedLocations((prev) => prev.filter((id) => id !== loc.id));
    } else {
      // DB'de varsa sadece silinecekler listesine ekle (Undo yapılabilir)
      setDeletedLocationIds((prev) => [...prev, loc.id]);
    }
  };

  const undoLocation = (id) => {
    // Silme işaretini kaldır
    setDeletedLocationIds((prev) => prev.filter((delId) => delId !== id));
  };


  const handleUnitChange = (locId, unitId, value) => {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return {
          ...loc,
          units: loc.units.map((unit) =>
            unit.id === unitId ? { ...unit, name: value } : unit,
          ),
        };
      }),
    );
  };

  const addUnit = (locId) => {
    const newId = Date.now();
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return {
          ...loc,
          units: [...loc.units, { id: newId, isNew: true, name: "" }],
        };
      }),
    );
    setFocusElementId(`unit-name-${newId}`);
  };

  const removeUnit = (locId, unit) => {
    if (unit.isNew) {
      setLocations((prev) =>
        prev.map((loc) => {
          if (loc.id !== locId) return loc;
          return { ...loc, units: loc.units.filter((u) => u.id !== unit.id) };
        }),
      );
    } else {
      setDeletedUnitIds((prev) => [...prev, unit.id]);
    }
  };

  const undoUnit = (unitId) => {
    setDeletedUnitIds((prev) => prev.filter((delId) => delId !== unitId));
  };

  const locationHasChanges = (loc) => {
    if (loc.isNew) return false;
    const initLoc = initialLocations.find(l => l.id === loc.id);
    if (!initLoc) return true;
    if (loc.name !== initLoc.name || loc.programNo !== initLoc.programNo) return true;
    if (initLoc.units.some(u => deletedUnitIds.includes(u.id))) return true;
    const activeUnits = loc.units.filter(u => !deletedUnitIds.includes(u.id));
    if (activeUnits.some(u => u.isNew || isUnitDirty(loc.id, u))) return true;
    return false;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Sadece silinmemiş olan ve değişikliği olan (isNew veya kirli) yerleşkeleri senkronize et
      const locationsToSync = locations.filter(
        loc => !deletedLocationIds.includes(loc.id) && (loc.isNew || locationHasChanges(loc))
      );

      await Promise.all([
        // 1. Silinecek yerleşkeleri temizle
        ...deletedLocationIds.map((id) => locationService.deleteLocation(id)),
        // 2. Yeni veya güncellenen yerleşkeleri/birimleri toplu senkronize et
        ...locationsToSync.map(async (loc) => {
          if (loc.isNew) {
            // Yeni yerleşke önce oluşturulur, sonra birimleri sync edilir
            const createRes = await locationService.createLocation({ name: loc.name, programNo: loc.programNo });
            const newLocId = createRes.data.location.id;
            if (loc.units?.length > 0) {
              await locationService.syncLocationWithUnits(newLocId, {
                name: loc.name,
                programNo: loc.programNo,
                units: loc.units.map(u => ({ name: u.name })),
              });
            }
          } else {
            // Mevcut yerleşke ve aktif birimleri tek bir API çağrısı ile senkronize edilir
            await locationService.syncLocationWithUnits(loc.id, {
              name: loc.name,
              programNo: loc.programNo,
              units: loc.units
                .filter(u => !deletedUnitIds.includes(u.id))
                .map(u => ({ id: u.isNew ? undefined : u.id, name: u.name })),
            });
          }
        }),
      ]);

      toast({ type: "success", message: "Değişiklikler başarıyla kaydedildi" });
      setDeletedLocationIds([]);
      setDeletedUnitIds([]);
      fetchData(); // Listeyi son haliyle tekrar tazele
    } catch (error) {
      console.error("Error saving locations:", error);
      toast({ type: "error", message: error.message || "Kaydedilirken bir hata oluştu" });
    } finally {
      setIsSaving(false);
    }
  };


  const openExportPanel = (location, type) => {
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
    const selectedPeriod = periods.find(p => String(p.id) === String(exportPeriodId));
    if (!selectedPeriod) {
      toast({ type: "error", message: "Seçilen periyod bulunamadı" });
      return;
    }

    setIsExporting(true);
    try {
      const params = {
        locationId: exportPanel.locationId,
        year: selectedPeriod.year,
        month: selectedPeriod.month,
        locationName: exportPanel.locationName,
      };

      if (exportPanel.type === "timesheet") {
        await downloadTimesheetExcel(params);
      } else if (exportPanel.type === "bot") {
        await downloadBotExcel(params);
      } else {
        await downloadSimpleExcel(params);
      }

      setExportPanel(null);
      toast({ type: "success", message: "Excel başarıyla indirildi" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ type: "error", message: error?.message || "Excel oluşturulurken hata oluştu" });
    } finally {
      setIsExporting(false);
    }
  };

  const hasUnsavedChanges = deletedLocationIds.length > 0 || deletedUnitIds.length > 0 || JSON.stringify(locations) !== JSON.stringify(initialLocations);

  const isLocationDirty = (loc) => {
    if (loc.isNew) return true;
    const initLoc = initialLocations.find(l => l.id === loc.id);
    if (!initLoc) return true;
    return loc.name !== initLoc.name || loc.programNo !== initLoc.programNo;
  };

  const isUnitDirty = (locId, unit) => {
    if (unit.isNew) return true;
    const initLoc = initialLocations.find(l => l.id === locId);
    if (!initLoc) return true;
    const initUnit = initLoc.units.find(u => u.id === unit.id);
    if (!initUnit) return true;
    return unit.name !== initUnit.name;
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
          <button type="button" className="btn" onClick={handleSave} disabled={isSaving}>
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
      <div className="locations-tree">
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
                      onChange={(e) =>
                        handleLocationChange(location.id, "name", e.target.value)
                      }
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
                      onChange={(e) =>
                        handleLocationChange(location.id, "programNo", e.target.value)
                      }
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

                        {/* Export Period Panel */}
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
                              onClick={handleExport}
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
                              onChange={(e) =>
                                handleUnitChange(location.id, unit.id, e.target.value)
                              }
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
                      className="add-btn add-unit-btn"
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
