import { useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import "../../styles/inputs.scss";
import "./Locations.scss";

function Locations() {
  // === STATE ===
  const [locations, setLocations] = useState([
    {
      id: 1,
      name: "",
      units: [
        { id: 101, name: "" },
        { id: 102, name: "" },
      ],
    },
    {
      id: 2,
      name: "",
      units: [{ id: 201, name: "" }],
    },
  ]);

  // === HANDLERS ===
  const handleLocationChange = (id, value) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, name: value } : loc)),
    );
  };

  const addLocation = () => {
    const newLocation = {
      id: Date.now(),
      name: "",
      units: [{ id: Date.now() + 1, name: "" }],
    };
    setLocations((prev) => [...prev, newLocation]);
  };

  const removeLocation = (id) => {
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

  return (
    <div className="locations-page">
      <h1 className="page-title">AYBÜ Gençlik Programı</h1>

      <div className="tree-container">
        {/* Sol taraftaki ana rehber çizgi */}
        <div className="tree-root-line" />

        {locations.map((location) => (
          <div key={location.id} className="tree-node location-node">
            {/* LEVEL 1: YERLEŞKE */}
            <div className="node-row location-row">
              <div className="floating-group">
                <input
                  type="text"
                  className="input"
                  placeholder=" "
                  value={location.name}
                  onChange={(e) =>
                    handleLocationChange(location.id, e.target.value)
                  }
                />
                <label className="floating-group__label">Yerleşke Adı</label>
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
            <div className="node-children">
              {location.units.map((unit) => (
                <div key={unit.id} className="tree-node unit-node">
                  <div className="node-row unit-row">
                    <div className="floating-group">
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
          </div>
        ))}

        {/* Yerleşke Ekleme Butonu */}
        <button
          type="button"
          className="add-btn add-location-btn"
          onClick={addLocation}
        >
          + Yeni Yerleşke Ekle
        </button>
      </div>
    </div>
  );
}

export default Locations;
