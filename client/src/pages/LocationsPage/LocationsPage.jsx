import { useState, useEffect, useRef } from "react";
import { RiDeleteBinLine, RiArrowRightSLine, RiFileExcel2Line, RiRobot2Line } from "react-icons/ri";
import "../../styles/inputs.scss";
import PageShell from "../../components/PageShell/PageShell";
import * as locationService from "../../api/locationAndUnitService";
import { downloadPuantajExcel, downloadSimpleExcel, downloadBotExcel } from "../../api/exportService";
import { useToast } from "../../components/ToastBar/ToastContext";
import "./LocationsPage.scss";

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

function LocationsPage() {
  // === STATE ===
  const [locations, setLocations] = useState([]);
  const [initialLocations, setInitialLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletedLocationIds, setDeletedLocationIds] = useState([]);
  const [expandedLocations, setExpandedLocations] = useState([]);

  // Export panel state: { locationId, locationName, type: 'simple'|'puantaj' } | null
  const [exportPanel, setExportPanel] = useState(null);
  const [exportYear, setExportYear] = useState(currentYear);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [isExporting, setIsExporting] = useState(false);

  const exportPanelRef = useRef(null);
  const toast = useToast();

  // === FETCH DATA ===
  useEffect(() => {
    fetchData();
  }, []);

  // Close export panel on outside click
  useEffect(() => {
    if (!exportPanel) return;
    const handleClick = (e) => {
      if (exportPanelRef.current && !exportPanelRef.current.contains(e.target)) {
        setExportPanel(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportPanel]);

  // === TOGGLE EXPAND ===
  const toggleLocationCollapse = (id) => {
    setExpandedLocations((prev) =>
      prev.includes(id) ? prev.filter((locId) => locId !== id) : [...prev, id]
    );
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [locRes, unitRes] = await Promise.all([
        locationService.getLocations(),
        locationService.getUnits()
      ]);

      const locs = locRes.data?.locations || [];
      const allUnits = unitRes.data?.units || [];

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
    const newLocation = {
      id: newId,
      name: "",
      programNo: "",
      units: [],
    };
    setLocations((prev) => [...prev, newLocation]);
    setExpandedLocations((prev) => [...prev, newId]);
  };

  const removeLocation = (id) => {
    if (typeof id === 'string') {
      setDeletedLocationIds(prev => [...prev, id]);
    }
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
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
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return {
          ...loc,
          units: [...loc.units, { id: Date.now(), name: "" }],
        };
      }),
    );
  };

  const removeUnit = (locId, unitId) => {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return {
          ...loc,
          units: loc.units.filter((unit) => unit.id !== unitId),
        };
      }),
    );
  };

  const handleSave = async () => {
    try {
      for (const id of deletedLocationIds) {
        await locationService.deleteLocation(id);
      }

      for (const loc of locations) {
        if (typeof loc.id === 'number') {
          const createRes = await locationService.createLocation({
            name: loc.name,
            programNo: loc.programNo
          });

          const newLocId = createRes.data.location.id;

          if (loc.units && loc.units.length > 0) {
            await locationService.syncLocationWithUnits(newLocId, {
              name: loc.name,
              programNo: loc.programNo,
              units: loc.units.map(u => ({ name: u.name }))
            });
          }
        } else {
          await locationService.syncLocationWithUnits(loc.id, {
            name: loc.name,
            programNo: loc.programNo,
            units: loc.units.map(u => ({
              id: typeof u.id === 'string' ? u.id : undefined,
              name: u.name
            }))
          });
        }
      }

      toast({ type: "success", message: "Değişiklikler başarıyla kaydedildi" });
      setDeletedLocationIds([]);
      fetchData();
    } catch (error) {
      console.error("Error saving locations:", error);
      toast({ type: "error", message: error.message || "Kaydedilirken bir hata oluştu" });
    }
  };

  const openExportPanel = (location, type) => {
    if (typeof location.id !== 'string') {
      toast({ type: "error", message: "Önce değişiklikleri kaydedin" });
      return;
    }
    setExportPanel({ locationId: location.id, locationName: location.name, type });
  };

  const handleExport = async () => {
    if (!exportPanel) return;
    setIsExporting(true);
    try {
      const params = {
        locationId: exportPanel.locationId,
        year: exportYear,
        month: exportMonth,
        locationName: exportPanel.locationName,
      };

      if (exportPanel.type === "puantaj") {
        await downloadPuantajExcel(params);
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

  const hasUnsavedChanges = deletedLocationIds.length > 0 || JSON.stringify(locations) !== JSON.stringify(initialLocations);

  const headerActions = hasUnsavedChanges ? (
    <button type="button" className="btn btn--primary" onClick={handleSave}>
      Değişiklikleri Kaydet
    </button>
  ) : null;

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
                      type="text"
                      className="input"
                      placeholder=" "
                      value={location.name}
                      onChange={(e) =>
                        handleLocationChange(location.id, "name", e.target.value)
                      }
                    />
                    <label className="floating-group__label">Yerleşke Adı</label>
                  </div>

                  <div className="floating-group floating-group--on-background">
                    <input
                      type="text"
                      className="input"
                      placeholder=" "
                      value={location.programNo}
                      onChange={(e) =>
                        handleLocationChange(location.id, "programNo", e.target.value)
                      }
                    />
                    <label className="floating-group__label">Program No</label>
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="export-btn-group" ref={isPanelOpen ? exportPanelRef : null}>
                  <button
                    type="button"
                    className="btn btn--export-excel btn--icon-only"
                    onClick={() => openExportPanel(location, "puantaj")}
                    title="Excel Export Al"
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
                          value={exportYear}
                          onChange={(e) => setExportYear(Number(e.target.value))}
                        >
                          {YEARS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <select
                          className="export-select"
                          value={exportMonth}
                          onChange={(e) => setExportMonth(Number(e.target.value))}
                        >
                          {TURKISH_MONTHS.map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn btn--primary export-panel__download-btn"
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
                  onClick={() => removeLocation(location.id)}
                  title="Yerleşkeyi Sil"
                >
                  <RiDeleteBinLine />
                </button>
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
                              type="text"
                              className="input"
                              placeholder=" "
                              value={unit.name}
                              onChange={(e) =>
                                handleUnitChange(location.id, unit.id, e.target.value)
                              }
                            />
                            <label className="floating-group__label">Birim Adı</label>
                          </div>

                          <button
                            type="button"
                            className="btn btn--danger btn--icon-only"
                            onClick={() => removeUnit(location.id, unit.id)}
                            title="Birimi Sil"
                          >
                            <RiDeleteBinLine />
                          </button>
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
