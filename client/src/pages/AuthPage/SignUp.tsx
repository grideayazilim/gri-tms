import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocationsAndUnits } from "../../hooks/data/useLocationsAndUnits";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@timesheet/shared";
import { useToast } from "../../components/ToastBar/ToastContext";
import type { SignUpType } from "@timesheet/shared";

interface SignUpProps {
  onToggle: () => void;
}

function SignUp({ onToggle }: SignUpProps) {
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { locations, units, fetchLocations, fetchUnitsByLocation } = useLocationsAndUnits();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignUpType>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "ADMIN",
      locationId: "",
      unitId: "",
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading) {
        handleSubmit(onSubmitForm)();
      }
    }
  };

  const locationId = watch("locationId");
  const role = watch("role");
  const isBirimSorumlusu = role === "RESPONSIBLE";

  // Sayfa ilk yüklendiğinde mevcut Yerleşkeleri sunucudan çeker
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Yerleşke seçimi değiştiğinde (watch('locationId')), o yerleşkeye bağlı birimleri getirir
  useEffect(() => {
    if (locationId) {
      fetchUnitsByLocation(locationId);
    } else {
      // Yerleşke seçimi temizlenirse birim seçimini de sıfırla
      setValue("unitId", "");
    }
  }, [locationId, fetchUnitsByLocation, setValue]);



  const onSubmitForm = async (data: SignUpType) => {
    setGeneralError("");
    setIsLoading(true);

    /**
     * ROL BAZLI KAYIT MANTIĞI:
     * - Eğer kullanıcı ADMIN ise: Herhangi bir yerleşke veya birime bağlı değildir (null).
     * - Eğer kullanıcı RESPONSIBLE (Birim Sorumlusu) ise: Zorunlu olarak bir yerleşke ve birim seçmelidir.
     */
    const result = await authRegister({
      username: data.username,
      password: data.password,
      role: data.role,
      unitId: data.role === "RESPONSIBLE" ? data.unitId : null,
      locationId: data.role === "RESPONSIBLE" ? data.locationId : null,
    });

    if (result.success) {
      // Kayıt başarılıysa kullanıcıya bilgi ver ve giriş ekranına yönlendir (Onay bekleme süreci)
      toast({
        type: 'success',
        message: 'Kayıt başarılı! Hesabınızın onaylanması için lütfen bekleyiniz.'
      });
      onToggle(); 
    } else {
      setGeneralError(result.error || "Kayıt başarısız");
    }

    setIsLoading(false);
  };


  return (
    <>
      <h1 className="auth-page__title">Hesap Oluştur</h1>
      <p className="auth-page__subtitle">
        Devam etmek için bir hesap oluşturun.
      </p>

      <form className="auth-page__form" onSubmit={handleSubmit(onSubmitForm)} onKeyDown={handleKeyDown}>
        {/* 3. Kullanıcı Türü */}
        <div className="auth-page__field">
          <div className="floating-group">
            <select
              id="role"
              className={`input input--select ${errors.role ? 'input--error' : ''}`}
              {...register('role')}
            >
              <option value="" disabled hidden></option>
              <option value="ADMIN">Admin</option>
              <option value="RESPONSIBLE">Birim Sorumlusu</option>
            </select>
            <label className="floating-group__label" htmlFor="role">
              Kullanıcı Türü
            </label>
            {errors.role && (
              <span className="input-error-message">{errors.role.message}</span>
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
                {...register('locationId')}
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
                <span className="input-error-message">{errors.locationId.message}</span>
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
                {...register('unitId')}
                disabled={!locationId}
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
                <span className="input-error-message">{errors.unitId.message}</span>
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

        {/* 2. Şifre */}
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
    </>
  );
}

export default SignUp;

