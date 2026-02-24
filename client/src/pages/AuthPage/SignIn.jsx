import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function SignIn({ onToggle }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ username: "", password: "" });
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    if (field === 'username') setUsername(value);
    if (field === 'password') setPassword(value);
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    // Clear general error
    if (generalError) {
      setGeneralError("");
    }
  };

  const validate = () => {
    const newErrors = { username: "", password: "" };
    let isValid = true;

    if (!username.trim()) {
      newErrors.username = "Kullanıcı adı gereklidir";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Şifre gereklidir";
      isValid = false;
    } else if (password.length < 3) {
      newErrors.password = "Şifre en az 3 karakter olmalıdır";
      isValid = false;
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

    const result = await login(username, password);

    if (result.success) {
      navigate("/");
    } else {
      setGeneralError(result.error || "Giriş başarısız");
    }

    setIsLoading(false);
  };

  return (
    <div className="auth-page__card">
      <h1 className="auth-page__title">Hesaba Giriş Yap</h1>
      <p className="auth-page__subtitle">
        Lütfen kullanıcı adınızı ve şifrenizi giriniz.
      </p>

      <form className="auth-page__form" onSubmit={handleSubmit}>

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
          <span className="auth-page__forgot">Şifreni mi unuttun?</span>
        </div>

        <div className="auth-page__remember">
          <input
            id="remember"
            type="checkbox"
            className="auth-page__checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <label htmlFor="remember" className="auth-page__remember-label">
            Şifreyi hatırla
          </label>
        </div>

        <button type="submit" className="btn auth-page__btn" disabled={isLoading}>
          {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      <p className="auth-page__footer">
        Henüz hesabın yok mu?{" "}
        <span className="auth-page__link" onClick={onToggle} style={{ cursor: 'pointer' }}>Hesap oluştur</span>
      </p>

      {generalError && (
          <div className="input-error-box">{generalError}</div>
        )}
    </div>
  );
}

export default SignIn;

