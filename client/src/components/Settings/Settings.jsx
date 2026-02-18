import { useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import "../../styles/inputs.scss";
import "./Settings.scss";

function Settings() {
  // STATE YÖNETİMİ
  const [loginInfo, setLoginInfo] = useState({ username: "", password: "" });
  const [systemInfo, setSystemInfo] = useState({
    dailyAllowance: "",
    weeklyLimit: "",
    programStart: "",
    programEnd: "",
  });
  const [markers, setMarkers] = useState([{ symbol: "X", description: "" }]);

  // SNAPSHOT STATE (İlk değerler)
  const [initialLoginInfo] = useState({ username: "", password: "" });
  const [initialSystemInfo] = useState({
    dailyAllowance: "",
    weeklyLimit: "",
    programStart: "",
    programEnd: "",
  });
  const [initialMarkers] = useState([{ symbol: "X", description: "" }]);

  // HANDLERS
  const handleLoginChange = (e) => {
    setLoginInfo({ ...loginInfo, [e.target.name]: e.target.value });
  };

  const handleSystemChange = (e) => {
    setSystemInfo({ ...systemInfo, [e.target.name]: e.target.value });
  };

  const handleMarkerChange = (index, field, value) => {
    const updated = [...markers];
    updated[index][field] = value;
    setMarkers(updated);
  };

  const addMarker = () => {
    setMarkers([...markers, { symbol: "X", description: "" }]);
  };

  const removeMarker = (index) => {
    setMarkers(markers.filter((_, i) => i !== index));
  };

  // DIRTY CHECK
  const isLoginDirty =
    JSON.stringify(loginInfo) !== JSON.stringify(initialLoginInfo);
  const isSystemDirty =
    JSON.stringify(systemInfo) !== JSON.stringify(initialSystemInfo) ||
    JSON.stringify(markers) !== JSON.stringify(initialMarkers);

  return (
    <div className="settings">
      <h1 className="settings__title">Ayarlar</h1>

      {/* --- GİRİŞ BİLGİLERİ --- */}
      <form className="settings__card" onSubmit={(e) => e.preventDefault()}>
        <div className="floating-group">
          <input
            type="text"
            id="username"
            name="username"
            className="input"
            placeholder=" "
            value={loginInfo.username}
            onChange={handleLoginChange}
          />
          <label htmlFor="username" className="floating-group__label">
            Kullanıcı Adı
          </label>
        </div>

        <div className="floating-group">
          <input
            type="password"
            id="password"
            name="password"
            className="input"
            placeholder=" "
            value={loginInfo.password}
            onChange={handleLoginChange}
          />
          <label htmlFor="password" className="floating-group__label">
            Şifre
          </label>
        </div>

        <button
          type="submit"
          className="btn settings__submit-btn"
          disabled={!isLoginDirty}
        >
          Giriş Bilgilerini Güncelle
        </button>
      </form>

      {/* --- SİSTEM BİLGİLERİ --- */}
      <form className="settings__card" onSubmit={(e) => e.preventDefault()}>
        <div className="floating-group">
          <input
            type="text"
            id="dailyAllowance"
            name="dailyAllowance"
            className="input"
            placeholder=" "
            value={systemInfo.dailyAllowance}
            onChange={handleSystemChange}
          />
          <label htmlFor="dailyAllowance" className="floating-group__label">
            Günlük Ödenek
          </label>
        </div>

        <div className="floating-group">
          <input
            type="text"
            id="weeklyLimit"
            name="weeklyLimit"
            className="input"
            placeholder=" "
            value={systemInfo.weeklyLimit}
            onChange={handleSystemChange}
          />
          <label htmlFor="weeklyLimit" className="floating-group__label">
            Haftalık Çalışma Sınırı
          </label>
        </div>

        <div className="settings__row">
          <div className="floating-group">
            <input
              type="date"
              id="programStart"
              name="programStart"
              className="input"
              placeholder=" "
              value={systemInfo.programStart}
              onChange={handleSystemChange}
            />
            <label htmlFor="programStart" className="floating-group__label">
              Program Başlangıç
            </label>
          </div>

          <div className="floating-group">
            <input
              type="date"
              id="programEnd"
              name="programEnd"
              className="input"
              placeholder=" "
              value={systemInfo.programEnd}
              onChange={handleSystemChange}
            />
            <label htmlFor="programEnd" className="floating-group__label">
              Program Bitiş
            </label>
          </div>
        </div>

        {/* --- PUANTAJ TREE --- */}
        <div className="settings__marker-section">
          <p className="settings__marker-title">Puantaj İşaretçisi</p>

          <div className="settings__marker-list">
            {markers.map((marker, index) => (
              <div
                className="settings__marker-item"
                key={marker.symbol + index}
              >
                <div className="floating-group marker-desc">
                  <input
                    type="text"
                    className="input"
                    placeholder=" "
                    value={marker.description}
                    onChange={(e) =>
                      handleMarkerChange(index, "description", e.target.value)
                    }
                  />
                  <label className="floating-group__label">Açıklama</label>
                </div>

                <div className="floating-group marker-symbol">
                  <input
                    type="text"
                    className="input input--center"
                    placeholder=" "
                    value={marker.symbol}
                    onChange={(e) =>
                      handleMarkerChange(index, "symbol", e.target.value)
                    }
                  />
                  <label className="floating-group__label">İşaretçi</label>
                </div>

                <button
                  type="button"
                  className="btn btn--danger btn--icon-only"
                  onClick={() => removeMarker(index)}
                  title="Sil"
                >
                  <RiDeleteBinLine />
                </button>
              </div>
            ))}

            <button
              type="button"
              className="settings__add-marker"
              onClick={addMarker}
            >
              + Yeni İşaretçi Ekle
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn settings__submit-btn"
          disabled={!isSystemDirty}
        >
          Sistem Bilgilerini Güncelle
        </button>
      </form>
    </div>
  );
}

export default Settings;
