import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocationsAndUnits } from "../../hooks/data/useLocationsAndUnits";

function SignUp({ onToggle }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [locationId, setLocationId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [errors, setErrors] = useState({
    username: "",
    password: "",
    role: "",
    locationId: "",
    unitId: "",
  });
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const { locations, units, fetchLocations, fetchUnitsByLocation } = useLocationsAndUnits();

  const isBirimSorumlusu = role === "RESPONSIBLE";

  // Yerleşkeleri yükle
  useEffect(() => {
    fetchLocations();
  }, []);

  // Yerleşke değiştiğinde birimleri yükle
  useEffect(() => {
    if (locationId) {
      fetchUnitsByLocation(locationId);
    } else {
      setUnitId("");
    }
  }, [locationId]);

  const handleInputChange = (field, value) => {
    // Update state
    if (field === 'username') setUsername(value);
    if (field === 'password') setPassword(value);
    if (field === 'role') setRole(value);
    if (field === 'locationId') setLocationId(value);
    if (field === 'unitId') setUnitId(value);

    // Clear field error when user starts typing/selecting
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    // Clear general error
    if (generalError) {
      setGeneralError("");
    }
  };

  const validate = () => {
    const newErrors = {
      username: "",
      password: "",
      role: "",
      locationId: "",
      unitId: "",
    };
    let isValid = true;

    if (!username.trim()) {
      newErrors.username = "Kullanıcı adı gereklidir";
      isValid = false;
    } else if (username.length < 3) {
      newErrors.username = "Kullanıcı adı en az 3 karakter olmalıdır";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Şifre gereklidir";
      isValid = false;
    } else if (password.length < 3) {
      newErrors.password = "Şifre en az 3 karakter olmalıdır";
      isValid = false;
    }

    if (!role) {
      newErrors.role = "Kullanıcı türü seçimi zorunludur";
      isValid = false;
    }

    if (role === "RESPONSIBLE") {
      if (!locationId) {
        newErrors.locationId = "Yerleşke seçimi zorunludur";
        isValid = false;
      }
      if (!unitId) {
        newErrors.unitId = "Birim seçimi zorunludur";
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setGeneralError("");
    setIsLoading(true);

    const result = await register(
      username,
      password,
      role,
      role === "RESPONSIBLE" ? unitId : null,
      role === "RESPONSIBLE" ? locationId : null
    );

    if (result.success) {
      navigate("/");
    } else {
      setGeneralError(result.error || "Kayıt başarısız");
    }

    setIsLoading(false);
  };

  return (
    <div className="auth-page__card">
      <h1 className="auth-page__title">Hesap Oluştur</h1>
      <p className="auth-page__subtitle">
        Devam etmek için bir hesap oluşturun.
      </p>

      <form className="auth-page__form" onSubmit={handleSubmit}>
        {/* 3. Kullanıcı Türü */}
        <div className="auth-page__field">
          <div className="floating-group">
            <select
              id="role"
              className={`input input--select ${errors.role ? 'input--error' : ''}`}
              value={role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              disabled={isLoading}
            >
              <option value="" disabled hidden></option>
              <option value="ADMIN">Admin</option>
              <option value="RESPONSIBLE">Birim Sorumlusu</option>
            </select>
            <label className="floating-group__label" htmlFor="role">
              Kullanıcı Türü
            </label>
            {errors.role && (
              <span className="input-error-message">{errors.role}</span>
            )}
          </div>
        </div>

        {/* 4. Yerleşke Seçimi */}
        {isBirimSorumlusu && (
          <div className="auth-page__field">
            <div className="floating-group">
              <select
                id="location"
                className={`input input--select ${errors.locationId ? 'input--error' : ''}`}
                value={locationId}
                onChange={(e) => handleInputChange('locationId', e.target.value)}
                disabled={isLoading}
              >
                <option value="" disabled hidden></option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.programNo})
                  </option>
                ))}
              </select>
              <label className="floating-group__label" htmlFor="location">
                Yerleşke
              </label>
              {errors.locationId && (
                <span className="input-error-message">{errors.locationId}</span>
              )}
            </div>
          </div>
        )}

        {/* 5. Birim Seçimi */}
        {isBirimSorumlusu && (
          <div className="auth-page__field">
            <div className="floating-group">
              <select
                id="unit"
                className={`input input--select ${errors.unitId ? 'input--error' : ''}`}
                value={unitId}
                onChange={(e) => handleInputChange('unitId', e.target.value)}
                disabled={!locationId || isLoading}
              >
                <option value="" disabled hidden></option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <label className="floating-group__label" htmlFor="unit">
                Birim
              </label>
              {errors.unitId && (
                <span className="input-error-message">{errors.unitId}</span>
              )}
            </div>
          </div>
        )}

        {/* 1. Kullanıcı Adı */}
        <div className="auth-page__field">
          <div className="floating-group">
            <input
              id="username"
              className={`input ${errors.username ? 'input--error' : ''}`}
              type="text"
              placeholder=" "
              value={username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isLoading}
            />
            <label className="floating-group__label" htmlFor="username">
              Kullanıcı Adı
            </label>
            {errors.username && (
              <span className="input-error-message">{errors.username}</span>
            )}
          </div>
        </div>

        {/* 2. Şifre */}
        <div className="auth-page__field">
          <div className="floating-group">
            <input
              id="password"
              className={`input ${errors.password ? 'input--error' : ''}`}
              type="password"
              placeholder=" "
              value={password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
            />
            <label className="floating-group__label" htmlFor="password">
              Şifre
            </label>
            {errors.password && (
              <span className="input-error-message">{errors.password}</span>
            )}
          </div>
        </div>

        <button type="submit" className="btn auth-page__btn" disabled={isLoading}>
          {isLoading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
        </button>
      </form>

      <p className="auth-page__footer">
        Hesabın var mı?{" "}
        <span className="auth-page__link" onClick={onToggle} style={{ cursor: 'pointer' }}>
          Giriş yap
        </span>
      </p>

      {generalError && (
          <div className="input-error-box">{generalError}</div>
        )}
    </div>
  );
}

export default SignUp;

