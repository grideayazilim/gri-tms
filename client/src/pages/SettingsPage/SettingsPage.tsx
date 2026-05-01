/* ========================================================================
   SETTINGS PAGE (AYARLAR SAYFASI)
   Hem kişisel profil (şifre/username) hem de global sistem ayarlarını yönetir.
   ======================================================================== */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSettingsSchema, systemSettingsSchema } from "@timesheet/shared";
import { toISODateString } from "../../utils/dateUtils";
import "../../styles/inputs.scss";
import PageShell from "../../components/PageShell/PageShell";
import PendingUserList from "./PendingUserList/PendingUserList";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../components/Modal";
import { useToast } from "../../components/ToastBar/ToastContext";
import { useSettings } from "../../hooks/data/useSettings";
import { useUsers } from "../../hooks/data/useUsers";
import { USER_STATUS } from "@timesheet/shared";
import "./SettingsPage.scss";


function SettingsPage() {
  const { isAdmin, user, updateProfile } = useAuth();

  // GİRİŞ BİLGİLERİ FORM
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isDirty: isLoginDirty },
    reset: resetLogin,
    setError: setLoginError,
  } = useForm({
    resolver: zodResolver(loginSettingsSchema),
    defaultValues: { username: user?.username || "", password: "" },
  });

  const onLoginSubmit = async (data: Record<string, string>) => {
    const payload = {
      username: data.username,
      // Şifre alanı boşsa payload'a eklemiyoruz (Sadece kullanıcı adı güncelleme durumu)
      ...(data.password ? { newPassword: data.password } : {})
    };

    const result = await editProfile(payload);
    if (result.success) {
      toast({ type: "success", message: "Giriş bilgileriniz güncellendi." });
      // AuthContext'i güncelle ki Navbar'daki isim anlık değişsin
      updateProfile({ username: result.data?.username || data.username });
      // Formu temizle ve yeni kullanıcı adını default yap
      resetLogin({ username: result.data?.username || data.username, password: "" });
    } else {
      toast({ type: "error", message: result.error || "Güncelleme başarısız." });
      // Eğer kullanıcı adı başkası tarafından alınmışsa (409 Conflict)
      if (result.status === 409 || result.error?.includes('kullanımda') || result.error?.includes('already in use')) {
        setLoginError('username', { type: 'manual', message: 'Bu kullanıcı adı zaten kullanımda.' });
      }
    }
  };


  const { showConfirm } = useModal();
  const toast = useToast();

  const {
    systemSettings,
    fetchSystemSettings,
    updateSystemSettings,
    pendingUsers,
    fetchPendingUsers,
    approveUser,
    rejectUser
  } = useSettings();

  const { editProfile } = useUsers();

  useEffect(() => {
    if (isAdmin) {
      fetchPendingUsers();
    }
  }, [isAdmin, fetchPendingUsers]);

  const handleApprove = async (userId: string) => {
    const result = await approveUser(userId);
    if (result.success) {
      toast({ type: "success", message: "Kullanıcı başarıyla onaylandı." });
      fetchPendingUsers();
    } else {
      toast({ type: "error", message: result.error || "Kullanıcı onaylanamadı." });
    }
  };

  const handleReject = async (userId: string) => {
    // Reddetme işlemi geri alınamaz olduğu için kullanıcıdan teyit alıyoruz
    const confirmed = await showConfirm({
      title: 'Kullanıcıyı Reddet',
      message: 'Adayı reddetmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Reddet',
      cancelText: 'Vazgeç',
    });

    if (confirmed) {
      const result = await rejectUser(userId);
      if (result.success) {
        toast({ type: "success", message: "Kullanıcı reddedildi ve silindi." });
        fetchPendingUsers();
      } else {
        toast({ type: "error", message: result.error || "Kullanıcı reddedilemedi." });
      }
    }
  };


  // SİSTEM BİLGİLERİ FORM
  const {
    register: systemRegister,
    handleSubmit: handleSystemSubmit,
    formState: { errors: systemErrors, isDirty: isSystemDirty },
    reset: resetSystem,
  } = useForm({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      dailyAllowance: "",
      weeklyLimit: "",
      programStart: "",
      programEnd: "",
    },
  });

  const onSystemSubmit = async (data: any) => {
    const norm = (v: any) => v || null;
    const datesChanged =
      norm(systemSettings?.programStart) !== norm(data.programStart) ||
      norm(systemSettings?.programEnd) !== norm(data.programEnd);

    if (datesChanged) {
      const confirmed = await showConfirm({
        title: 'Tarih Değişikliği',
        message: 'Program tarihleri değiştiğinde tüm dönemler yeniden oluşturulur. Devam etmek istiyor musunuz?',
        type: 'warning',
        confirmText: 'Evet, Güncelle',
        cancelText: 'Vazgeç',
      });
      if (!confirmed) return;
    }

    const result = await updateSystemSettings(data);
    if (result.success) {
      toast({ type: "success", message: "Sistem ayarları güncellendi." });
      resetSystem(data);
    } else {
      toast({ type: "error", message: result.error });
    }
  };


  useEffect(() => {
    if (isAdmin) {
      fetchSystemSettings();
    }
  }, [isAdmin, fetchSystemSettings]);

  useEffect(() => {
    if (systemSettings) {
      resetSystem({
        dailyAllowance: systemSettings.dailyAllowance || "",
        weeklyLimit: systemSettings.weeklyLimit || "",
        programStart: toISODateString(systemSettings.programStart),
        programEnd: toISODateString(systemSettings.programEnd),
      });
    }
  }, [systemSettings, resetSystem]);

  return (
    <PageShell title="Ayarlar">
      {isAdmin && (
        <PendingUserList
          pendingUsers={pendingUsers}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* --- GİRİŞ BİLGİLERİ --- */}
      <form className="settings-card" onSubmit={handleLoginSubmit(onLoginSubmit)}>
        <h2 className="settings-card__title">Giriş Bilgileri</h2>

        <div className="floating-group">
          <input
            type="text"
            id="username"
            className={`input ${loginErrors.username ? 'input--error' : ''}`}
            placeholder=" "
            {...loginRegister('username')}
          />
          <label htmlFor="username" className="floating-group__label">
            Kullanıcı Adı
          </label>
          {loginErrors.username && (
            <span className="input-error-message">{loginErrors.username.message}</span>
          )}
        </div>

        <div className="floating-group">
          <input
            type="password"
            id="password"
            className={`input ${loginErrors.password ? 'input--error' : ''}`}
            placeholder=" "
            {...loginRegister('password')}
          />
          <label htmlFor="password" className="floating-group__label">
            Şifre
          </label>
          {loginErrors.password && (
            <span className="input-error-message">{loginErrors.password.message}</span>
          )}
        </div>

        <button
          type="submit"
          className="btn settings-card__submit"
          disabled={!isLoginDirty}
        >
          Giriş Bilgilerini Güncelle
        </button>
      </form>

      {/* --- SİSTEM BİLGİLERİ --- */}
      {isAdmin && (
        <form className="settings-card" onSubmit={handleSystemSubmit(onSystemSubmit)}>
          <h2 className="settings-card__title">Sistem Ayarları</h2>

        <div className="floating-group">
          <input
            type="text"
            inputMode="decimal"
            id="dailyAllowance"
            className={`input ${systemErrors.dailyAllowance ? 'input--error' : ''}`}
            placeholder=" "
            {...systemRegister('dailyAllowance')}
          />
          <label htmlFor="dailyAllowance" className="floating-group__label">
            Günlük Ödenek (₺)
          </label>
          {systemErrors.dailyAllowance && (
            <span className="input-error-message">{systemErrors.dailyAllowance.message}</span>
          )}
        </div>

        <div className="floating-group">
          <input
            type="text"
            inputMode="numeric"
            id="weeklyLimit"
            className={`input ${systemErrors.weeklyLimit ? 'input--error' : ''}`}
            placeholder=" "
            {...systemRegister('weeklyLimit')}
          />
          <label htmlFor="weeklyLimit" className="floating-group__label">
            Haftalık Çalışma Sınırı (Gün)
          </label>
          {systemErrors.weeklyLimit && (
            <span className="input-error-message">{systemErrors.weeklyLimit.message}</span>
          )}
        </div>

        <div className="settings-row">
          <div className="floating-group">
            <input
              type="date"
              id="programStart"
              className={`input ${systemErrors.programStart ? 'input--error' : ''}`}
              placeholder=" "
              {...systemRegister('programStart')}
            />
            <label htmlFor="programStart" className="floating-group__label">
              Program Başlangıç
            </label>
            {systemErrors.programStart && (
              <span className="input-error-message">{systemErrors.programStart.message}</span>
            )}
          </div>

          <div className="floating-group">
            <input
              type="date"
              id="programEnd"
              className={`input ${systemErrors.programEnd ? 'input--error' : ''}`}
              placeholder=" "
              {...systemRegister('programEnd')}
            />
            <label htmlFor="programEnd" className="floating-group__label">
              Program Bitiş
            </label>
            {systemErrors.programEnd && (
              <span className="input-error-message">{systemErrors.programEnd.message}</span>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn settings-card__submit"
          disabled={!isSystemDirty}
        >
          Sistem Ayarlarını Güncelle
        </button>
      </form>
      )}
    </PageShell>
  );
}

export default SettingsPage;
