import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInSchema, type SignInType } from "@timesheet/shared";

interface SignInProps {
  onToggle: () => void;
}

function SignIn({ onToggle }: SignInProps) {
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // React Hook Form Kurulumu: Zod şeması ile validasyon yapılır.
  // hookform/resolvers v5: zodResolver returns Resolver<z.input, any, z.output>.
  // TFieldValues = z.input (matches resolver's first param exactly under EOP).
  // TTransformedValues = SignInType (z.output) — what the submit handler receives.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof signInSchema>, unknown, SignInType>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });


  // Enter tuşuna basıldığında formu otomatik gönderen yardımcı fonksiyon
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading) {
        handleSubmit(onSubmitForm)();
      }
    }
  };


  const onSubmitForm = async (data: SignInType) => {
    setGeneralError("");
    setIsLoading(true);

    // AuthContext üzerindeki login metodunu çağır (HTTP-Only Cookie set edilir)
    const result = await login(data.username, data.password);

    if (result.success) {
      // Giriş başarılıysa ana sayfaya yönlendir
      navigate("/");
    } else {
      // Hata mesajını (örn: Yanlış şifre) ekranda göster
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

      <form className="auth-page__form" onSubmit={handleSubmit(onSubmitForm)} onKeyDown={handleKeyDown}>

        <div className="auth-page__field">
          <div className="floating-group">
            <input
              id="username"
              className={`input ${errors.username ? 'input--error' : ''}`}
              type="text"
              placeholder=" "
              {...register('username')}
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
            />
            <label className="floating-group__label" htmlFor="password">
              Şifre
            </label>
            {errors.password && (
              <span className="input-error-message">{errors.password.message}</span>
            )}
          </div>
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

