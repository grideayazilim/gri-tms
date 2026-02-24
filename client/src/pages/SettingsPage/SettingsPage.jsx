import { useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import "../../styles/inputs.scss";
import "../../styles/page-layout.scss";
import "./SettingsPage.scss";

function SettingsPage() {
  // STATE YÖNETİMİ
  const [loginInfo, setLoginInfo] = useState({ username: "", password: "" });
  const [systemInfo, setSystemInfo] = useState({
    dailyAllowance: "",
    weeklyLimit: "",
    programStart: "",
    programEnd: "",
  });
  const [markers, setMarkers] = useState([
    { code: "X", label: "Geldi", isPaid: true },
    { code: "İ", label: "İzinli", isPaid: false },
    { code: "R", label: "Raporlu", isPaid: false },
    { code: "DT", label: "Devlet Tatili", isPaid: true },
    { code: "RT", label: "Resmi Tatil", isPaid: true },
  ]);

  // SNAPSHOT STATE (İlk değerler)
  const [initialLoginInfo] = useState({ username: "", password: "" });
  const [initialSystemInfo] = useState({
    dailyAllowance: "",
    weeklyLimit: "",
    programStart: "",
    programEnd: "",
  });
  const [initialMarkers] = useState([
    { code: "X", label: "Geldi", isPaid: true },
    { code: "İ", label: "İzinli", isPaid: false },
    { code: "R", label: "Raporlu", isPaid: false },
    { code: "DT", label: "Devlet Tatili", isPaid: true },
    { code: "RT", label: "Resmi Tatil", isPaid: true },
  ]);

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
    setMarkers([...markers, { code: "", label: "", isPaid: true }]);
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
    <main className="page-container">
      <h1 className="page-title">Ayarlar</h1>

      {/* --- GİRİŞ BİLGİLERİ --- */}
      <form className="settings-card" onSubmit={(e) => e.preventDefault()}>
        <h2 className="settings-card__title">Giriş Bilgileri</h2>

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
          className="btn btn--primary settings-card__submit"
          disabled={!isLoginDirty}
        >
          Giriş Bilgilerini Güncelle
        </button>
      </form>

      {/* --- SİSTEM BİLGİLERİ --- */}
      <form className="settings-card" onSubmit={(e) => e.preventDefault()}>
        <h2 className="settings-card__title">Sistem Ayarları</h2>

        <div className="floating-group">
          <input
            type="number"
            id="dailyAllowance"
            name="dailyAllowance"
            className="input"
            placeholder=" "
            value={systemInfo.dailyAllowance}
            onChange={handleSystemChange}
          />
          <label htmlFor="dailyAllowance" className="floating-group__label">
            Günlük Ödenek (₺)
          </label>
        </div>

        <div className="floating-group">
          <input
            type="number"
            id="weeklyLimit"
            name="weeklyLimit"
            className="input"
            placeholder=" "
            value={systemInfo.weeklyLimit}
            onChange={handleSystemChange}
          />
          <label htmlFor="weeklyLimit" className="floating-group__label">
            Haftalık Çalışma Sınırı (Gün)
          </label>
        </div>

        <div className="settings-row">
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

        {/* --- PUANTAJ İŞARETÇİLERİ --- */}
        <div className="marker-section">
          <h3 className="marker-section__title">Puantaj İşaretçileri</h3>

          <div className="marker-list">
            {markers.map((marker, index) => (
              <div className="marker-item" key={index}>
                <div className="floating-group marker-item__code">
                  <input
                    type="text"
                    className="input input--center"
                    placeholder=" "
                    value={marker.code}
                    onChange={(e) =>
                      handleMarkerChange(index, "code", e.target.value)
                    }
                    maxLength={3}
                  />
                  <label className="floating-group__label">Kod</label>
                </div>

                <div className="floating-group marker-item__label">
                  <input
                    type="text"
                    className="input"
                    placeholder=" "
                    value={marker.label}
                    onChange={(e) =>
                      handleMarkerChange(index, "label", e.target.value)
                    }
                  />
                  <label className="floating-group__label">Açıklama</label>
                </div>

                <label className="checkbox-label marker-item__paid">
                  <input
                    type="checkbox"
                    checked={marker.isPaid}
                    onChange={(e) =>
                      handleMarkerChange(index, "isPaid", e.target.checked)
                    }
                  />
                  <span>Ücretli</span>
                </label>

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
              className="add-marker-btn"
              onClick={addMarker}
            >
              + Yeni İşaretçi Ekle
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--primary settings-card__submit"
          disabled={!isSystemDirty}
        >
          Sistem Ayarlarını Güncelle
        </button>
      </form>
    </main>
  );
}

export default SettingsPage;

