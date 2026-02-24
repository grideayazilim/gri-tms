import { useState } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import "./SignIn.scss";

function SignIn() {
  const { isPhone, isTablet } = useBreakpoint();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, password, rememberMe });
  };

  return (
    <div
      className={`signin ${isPhone ? "signin--phone" : ""} ${isTablet ? "signin--tablet" : ""}`}
    >
      <svg
        className="signin__wave"
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

      <div className="signin__card">
        <h1 className="signin__title">Hesaba Giriş Yap</h1>
        <p className="signin__subtitle">
          Lütfen e posta adresinizi ve şifrenizi giriniz.
        </p>

        <form className="signin__form" onSubmit={handleSubmit}>
          <div className="signin__field">
            <div className="floating-group">
              <input
                id="email"
                className="input"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="floating-group__label" htmlFor="email">
                Email adresi
              </label>
            </div>
          </div>

          <div className="signin__field">
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
            <span className="signin__forgot">Şifreni mi unuttun?</span>
          </div>

          <div className="signin__remember">
            <input
              id="remember"
              type="checkbox"
              className="signin__checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember" className="signin__remember-label">
              Şifreyi hatırla
            </label>
          </div>

          <button type="submit" className="btn signin__btn">
            Giriş Yap
          </button>
        </form>

        <p className="signin__footer">
          Henüz hesabın yok mu?{" "}
          <span className="signin__link">Hesap oluştur</span>
        </p>
      </div>
    </div>
  );
}

export default SignIn;
