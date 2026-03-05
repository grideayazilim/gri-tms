import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "../../schemas/auth.schema";

function SignIn({ onToggle }) {
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmitForm = async (data) => {
    setGeneralError("");
    setIsLoading(true);

    const result = await login(data.username, data.password);

    if (result.success) {
      navigate("/");
    } else {
      setGeneralError(result.error || "Giriş başarısız");
    }

    setIsLoading(false);
  };

  return (
    <>
      <h1 className="auth-page__title">Hesaba Giriş Yap</h1>
      <p className="auth-page__subtitle">
        Lütfen kullanıcı adınızı ve şifrenizi giriniz.
      </p>

      <form className="auth-page__form" onSubmit={handleSubmit(onSubmitForm)}>

        <div className="auth-page__field">
          <div className="floating-group">
            <input
              id="username"
              className={`input ${errors.username ? 'input--error' : ''}`}
              type="text"
              placeholder=" "
              {...register('username')}
              disabled={isLoading}
            />
            <label className="floating-group__label" htmlFor="username">
              Kullanıcı Adı
            </label>
            {errors.username && (
              <span className="input-error-message">{errors.username.message}</span>
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
              {...register('password')}
              disabled={isLoading}
            />
            <label className="floating-group__label" htmlFor="password">
              Şifre
            </label>
            {errors.password && (
              <span className="input-error-message">{errors.password.message}</span>
            )}
          </div>
          <span className="auth-page__forgot">Şifreni mi unuttun?</span>
        </div>

        <div className="auth-page__remember">
          <input
            id="rememberMe"
            type="checkbox"
            className="auth-page__checkbox"
            {...register('rememberMe')}
            disabled={isLoading}
          />
          <label htmlFor="rememberMe" className="auth-page__remember-label">
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
    </>
  );
}

export default SignIn;

