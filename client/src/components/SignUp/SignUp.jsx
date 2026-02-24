import { useState } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import "./SignUp.scss";

// Deneme verisi (API'den gelecek)
const locationUnits = {
  "yerleske-1": [
    { value: "birim1.1", label: "Birim1.1" },
    { value: "birim1.2", label: "Birim1.2" },
  ],
  "yerleske-2": [
    { value: "birim2.1", label: "Birim2.1" },
    { value: "birim2.2", label: "Birim2.2" },
  ],
};

function SignUp() {
  const { isPhone, isTablet } = useBreakpoint();
  const [userType, setUserType] = useState("");
  const [location, setLocation] = useState("");
  const [unit, setUnit] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isBirimSorumlusu = userType === "birim-sorumlusu";

  // Yerleşke değişince birimi sıfırla
  const handleLocationChange = (value) => {
    setLocation(value);
    setUnit("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ userType, location, unit, username, password });
  };

  return (
    <div
      className={`signup ${isPhone ? "signup--phone" : ""} ${isTablet ? "signup--tablet" : ""}`}
    >
      <svg
        className="signup__wave"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-200,600 C100,350 400,800 750,450 C1100,100 1300,550 1650,300"
          fill="none"
          stroke="rgba(0, 40, 160, 0.18)"
          strokeWidth="380"
          strokeLinecap="round"
        />
      </svg>

      <div className="signup__card">
        <h1 className="signup__title">Hesap Oluştur</h1>
        <p className="signup__subtitle">
          Devam etmek için bir hesap oluşturun.
        </p>

        <form className="signup__form" onSubmit={handleSubmit}>
          {/* 1. Kullanıcı Türü */}
          <div className="signup__field">
            <div className="floating-group">
              <select
                id="userType"
                className="input input--select"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                required
              >
                <option value="" disabled hidden></option>
                <option value="admin">Admin</option>
                <option value="birim-sorumlusu">Birim Sorumlusu</option>
              </select>
              <label className="floating-group__label" htmlFor="userType">
                Kullanıcı Türü
              </label>
            </div>
          </div>

          {/* 2. Yerleşke Seçimi*/}
          {isBirimSorumlusu && (
            <div className="signup__field">
              <div className="floating-group">
                <select
                  id="location"
                  className="input input--select"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  required
                >
                  <option value="" disabled hidden></option>
                  <option value="yerleske-1">Yerleşke 1</option>
                  <option value="yerleske-2">Yerleşke 2</option>
                </select>
                <label className="floating-group__label" htmlFor="location">
                  Yerleşke
                </label>
              </div>
            </div>
          )}

          {/* 3. Birim Seçimi */}
          {isBirimSorumlusu && (
            <div className="signup__field">
              <div className="floating-group">
                <select
                  id="unit"
                  className="input input--select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={!location}
                  required
                >
                  <option value="" disabled hidden></option>
                  {(locationUnits[location] || []).map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <label className="floating-group__label" htmlFor="unit">
                  Birim
                </label>
              </div>
            </div>
          )}

          {/* 4. Kullanıcı Adı */}
          <div className="signup__field">
            <div className="floating-group">
              <input
                id="username"
                className="input"
                type="text"
                placeholder=" "
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <label className="floating-group__label" htmlFor="username">
                Kullanıcı Adı
              </label>
            </div>
          </div>

          {/* 5. Şifre */}
          <div className="signup__field">
            <div className="floating-group">
              <input
                id="password"
                className="input"
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label className="floating-group__label" htmlFor="password">
                Şifre
              </label>
            </div>
          </div>

          <button type="submit" className="btn signup__btn">
            Hesap Oluştur
          </button>
        </form>

        <p className="signup__footer">
          Hesabın var mı?{" "}
          <span className="signup__link">
            Giriş yap
          </span>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
