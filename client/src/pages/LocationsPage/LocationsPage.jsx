import { useState, useEffect } from "react";
import { RiDeleteBinLine, RiArrowDownSLine, RiArrowRightSLine } from "react-icons/ri";
import "../../styles/inputs.scss";
import PageShell from "../../components/PageShell/PageShell";
import * as locationService from "../../api/locationAndUnitService";
import { useToast } from "../../components/ToastBar/ToastContext";
import "./LocationsPage.scss";

function LocationsPage() {
  // === STATE ===
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletedLocationIds, setDeletedLocationIds] = useState([]);
  const [collapsedLocations, setCollapsedLocations] = useState([]);
  const toast = useToast();

  // === FETCH DATA ===
  useEffect(() => {
    fetchData();
  }, []);

  // === TOGGLE COLLAPSE ===
  const toggleLocationCollapse = (id) => {
    setCollapsedLocations((prev) =>
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
    const newLocation = {
      id: Date.now(),
      name: "",
      programNo: "",
      units: [{ id: Date.now() + 1, name: "" }],
    };
    setLocations((prev) => [...prev, newLocation]);
  };

  const removeLocation = (id) => {
    // Eğer ID string ise (UUID), silinecekler listesine ekle
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
      // 1. Silinen yerleşkeleri sil
      for (const id of deletedLocationIds) {
        await locationService.deleteLocation(id);
      }

      // 2. Mevcut ve yeni yerleşkeleri işle
      for (const loc of locations) {
        // Yeni yerleşke (temp numeric ID)
        if (typeof loc.id === 'number') {
          const createRes = await locationService.createLocation({
            name: loc.name,
            programNo: loc.programNo
          });

          const newLocId = createRes.data.location.id;

          // Birimleri de ekle (createLocation birimleri almıyor demiştik)
          if (loc.units && loc.units.length > 0) {
            await locationService.syncLocationWithUnits(newLocId, {
              name: loc.name,
              programNo: loc.programNo,
              units: loc.units.map(u => ({ name: u.name }))
            });
          }
        }
        // Mevcut yerleşke (UUID)
        else {
          await locationService.syncLocationWithUnits(loc.id, {
            name: loc.name,
            programNo: loc.programNo,
            units: loc.units.map(u => ({
              id: typeof u.id === 'string' ? u.id : undefined, // Yeni birimler için ID gönderme
              name: u.name
            }))
          });
        }
      }

      toast({ type: "success", message: "Değişiklikler başarıyla kaydedildi" });
      setDeletedLocationIds([]);
      fetchData(); // Listeyi güncelle
    } catch (error) {
      console.error("Error saving locations:", error);
      toast({ type: "error", message: error.message || "Kaydedilirken bir hata oluştu" });
    }
  };

  const headerActions = (
    <button type="button" className="btn btn--primary" onClick={handleSave}>
      Değişiklikleri Kaydet
    </button>
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
      <div className="locations-tree">
        {/* Sol taraftaki ana rehber çizgi */}
        <div className="tree-root-line" />

        {locations.map((location) => {
          const isCollapsed = collapsedLocations.includes(location.id);
          return (
            <div key={location.id} className={`tree-node location-node ${isCollapsed ? 'is-collapsed' : ''}`}>
              {/* LEVEL 1: YERLEŞKE */}
              <div className="node-row location-row">
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => toggleLocationCollapse(location.id)}
                  title={isCollapsed ? "Genişlet" : "Gizle"}
                >
                  {isCollapsed ? <RiArrowRightSLine /> : <RiArrowDownSLine />}
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

                <button
                  type="button"
                  className="btn btn--danger btn--icon-only"
                  onClick={() => removeLocation(location.id)}
                  title="Yerleşkeyi Sil"
                >
                  <RiDeleteBinLine />
                </button>
              </div>

              {/* LEVEL 2: BİRİMLER - Conditional Rendering */}
              {!isCollapsed && (
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

                  {/* Birim Ekleme Butonu */}
                  <button
                    type="button"
                    className="add-btn add-unit-btn"
                    onClick={() => addUnit(location.id)}
                  >
                    + Yeni Birim Ekle
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Yerleşke Ekleme Butonu */}
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

