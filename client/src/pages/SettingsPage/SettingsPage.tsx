/* ========================================================================
   SETTINGS PAGE (AYARLAR SAYFASI)
   Hem kişisel profil (şifre/username) hem de global sistem ayarlarını yönetir.
   ======================================================================== */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSettingsSchema, systemSettingsSchema } from "@timesheet/shared";
import type { LoginSettingsType, SystemSettingsType } from "@timesheet/shared";
import { toISODateString } from "../../utils/dateUtils";
import "../../styles/inputs.scss";
import PageShell from "../../components/PageShell/PageShell";
import PendingUserList from "./PendingUserList/PendingUserList";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../components/Modal";
import { useToast } from "../../components/ToastBar/useToast";
import { useSettings } from "../../hooks/data/useSettings";
import { useUsers } from "../../hooks/data/useUsers";
import { USER_STATUS } from "@timesheet/shared";
import { resetSystem as callResetSystem } from "../../api/settingsService";
import "./SettingsPage.scss";


function SettingsPage() {
  const { isAdmin, user, updateProfile, logout } = useAuth();

  // GİRİŞ BİLGİLERİ FORM
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isDirty: isLoginDirty },
    reset: resetLogin,
    setError: setLoginError,
  } = useForm<LoginSettingsType>({
    resolver: zodResolver(loginSettingsSchema),
    defaultValues: { username: user?.username || "", password: "" },
  });

  const onLoginSubmit = async (data: LoginSettingsType) => {
    const payload = {
      username: data.username,
      // Şifre alanı boşsa payload'a eklemiyoruz (Sadece kullanıcı adı güncelleme durumu)
      ...(data.password ? { newPassword: data.password } : {})
    };

    const result = await editProfile(payload);
    if (result.success) {
      toast({ type: "success", message: "Giriş bilgileriniz güncellendi." });
      // AuthContext'i güncelle ki Navbar'daki isim anlık değişsin
      updateProfile({ username: result.data.user.username || data.username });
      // Formu temizle ve yeni kullanıcı adını default yap
      resetLogin({ username: result.data.user.username || data.username, password: "" });
    } else {
      toast({ type: "error", message: result.error || "Güncelleme başarısız." });
      // Eğer kullanıcı adı başkası tarafından alınmışsa (409 Conflict)
      if (result.code === '409' || result.error?.includes('kullanımda') || result.error?.includes('already in use')) {
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

  // ─── Sistem Sıfırlama State ───────────────────────────────────────────────
  const [resetBackup, setResetBackup] = useState<'with' | 'without'>('with');
  const [resetDeleteLocations, setResetDeleteLocations] = useState(false);
  const [resetDailyWage, setResetDailyWage] = useState('');
  const [resetWeeklyDays, setResetWeeklyDays] = useState('');
  const [resetStartDate, setResetStartDate] = useState('');
  const [resetEndDate, setResetEndDate] = useState('');
  const [isResetting, setIsResetting] = useState(false);

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
  } = useForm<SystemSettingsType>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      dailyAllowance: "",
      weeklyLimit: "",
      programStart: "",
      programEnd: "",
    },
  });

  const onSystemSubmit = async (data: SystemSettingsType) => {
    const norm = (v: string | number | null | undefined) => v || null;
    const datesChanged =
      norm(systemSettings?.programStartDate) !== norm(data.programStart) ||
      norm(systemSettings?.programEndDate) !== norm(data.programEnd);

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

  const handleSystemReset = async () => {
    const dailyWageNum = parseFloat(resetDailyWage);
    const weeklyDaysNum = parseInt(resetWeeklyDays, 10);

    if (!resetDailyWage || isNaN(dailyWageNum) || dailyWageNum <= 0) {
      toast({ type: "error", message: "Geçerli bir günlük ücret giriniz." });
      return;
    }
    if (!resetWeeklyDays || isNaN(weeklyDaysNum) || weeklyDaysNum <= 0) {
      toast({ type: "error", message: "Geçerli bir haftalık gün sınırı giriniz." });
      return;
    }
    if (!resetStartDate || !resetEndDate) {
      toast({ type: "error", message: "Lütfen program başlangıç ve bitiş tarihlerini giriniz." });
      return;
    }
    if (resetEndDate <= resetStartDate) {
      toast({ type: "error", message: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır." });
      return;
    }

    const confirmed = await showConfirm({
      title: 'Sistemi Sıfırla',
      message: 'Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Onayla',
      cancelText: 'İptal',
    });
    if (!confirmed) return;

    setIsResetting(true);
    try {
      const payload = {
        backup: resetBackup === 'with',
        deleteLocationsAndUnits: resetDeleteLocations,
        newSettings: {
          dailyWage: dailyWageNum,
          maxWeeklyDays: weeklyDaysNum,
          programStartDate: resetStartDate,
          programEndDate: resetEndDate,
        },
      };

      const response = await callResetSystem(payload);

      // Yedekli modda yanıt blob olarak gelir → indir
      if (payload.backup && response instanceof Blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const url = URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sistem-yedegi-${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({ type: "success", message: "Sistem başarıyla sıfırlandı." });
      // Admin olmayan tüm session'lar geçersiz oldu; tutarlı başlangıç için logout yap
      setTimeout(() => { void logout(); }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Sistem sıfırlanamadı.';
      toast({ type: "error", message });
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (systemSettings) {
      resetSystem({
        dailyAllowance: systemSettings.dailyAllowance || "",
        weeklyLimit: systemSettings.weeklyLimit || "",
        programStart: toISODateString(systemSettings.programStartDate),
        programEnd: toISODateString(systemSettings.programEndDate),
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
      {/* --- SİSTEM SIFIRLAMA (DANGER ZONE) --- */}
      {isAdmin && (
        <div className="settings-card settings-card--danger">
          <h2 className="settings-card__title settings-card__title--danger">Sistem Sıfırlama</h2>
          <p className="settings-card__description">
            Bu işlem geri alınamaz. Sistem yeni bir programa geçiş için sıfırlanır.
            Adminler korunur; tüm çalışanlar, kullanıcılar ve log kayıtları silinir.
          </p>

          {/* Yedekleme Seçeneği */}
          <div className="reset-section">
            <p className="reset-section__label">Yedekleme Seçeneği</p>
            <label className="checkbox-label">
              <input
                type="radio"
                name="resetBackup"
                value="with"
                checked={resetBackup === 'with'}
                onChange={() => setResetBackup('with')}
              />
              <span>Yedekli (önerilen)</span>
            </label>
            <p className="reset-section__hint">
              Silmeden önce tüm aktif dönemler için yerleşke bazında maaş Excel çıktısı alınır ve zip olarak indirilir.
            </p>
            <label className="checkbox-label" style={{ marginTop: '6px' }}>
              <input
                type="radio"
                name="resetBackup"
                value="without"
                checked={resetBackup === 'without'}
                onChange={() => setResetBackup('without')}
              />
              <span>Yedeksiz</span>
            </label>
            <p className="reset-section__hint">
              Yedekleme yapılmaz, veriler direkt silinir.
            </p>
          </div>

          {/* Sıfırlama Sonrası Ayarlar */}
          <div className="reset-section">
            <p className="reset-section__label">Sıfırlama Sonrası Ayarlar</p>

            <label className="checkbox-label" style={{ marginBottom: '12px' }}>
              <input
                type="checkbox"
                checked={resetDeleteLocations}
                onChange={(e) => setResetDeleteLocations(e.target.checked)}
              />
              <span>Yerleşke ve birimleri de sil</span>
            </label>
            <p className="reset-section__hint" style={{ marginTop: '-8px', marginBottom: '12px' }}>
              İşaretlenirse tüm lokasyon ve birim verileri de temizlenir.
            </p>

            <div className="settings-row">
              <div className="floating-group">
                <input
                  type="text"
                  inputMode="decimal"
                  id="resetDailyWage"
                  className="input"
                  placeholder=" "
                  value={resetDailyWage}
                  onChange={(e) => setResetDailyWage(e.target.value)}
                />
                <label htmlFor="resetDailyWage" className="floating-group__label">
                  Günlük Ödenek (₺)
                </label>
              </div>

              <div className="floating-group">
                <input
                  type="text"
                  inputMode="numeric"
                  id="resetWeeklyDays"
                  className="input"
                  placeholder=" "
                  value={resetWeeklyDays}
                  onChange={(e) => setResetWeeklyDays(e.target.value)}
                />
                <label htmlFor="resetWeeklyDays" className="floating-group__label">
                  Haftalık Çalışma Sınırı (Gün)
                </label>
              </div>
            </div>

            <div className="settings-row">
              <div className="floating-group">
                <input
                  type="date"
                  id="resetStartDate"
                  className="input"
                  placeholder=" "
                  value={resetStartDate}
                  onChange={(e) => setResetStartDate(e.target.value)}
                />
                <label htmlFor="resetStartDate" className="floating-group__label">
                  Yeni Program Başlangıcı
                </label>
              </div>

              <div className="floating-group">
                <input
                  type="date"
                  id="resetEndDate"
                  className="input"
                  placeholder=" "
                  value={resetEndDate}
                  onChange={(e) => setResetEndDate(e.target.value)}
                />
                <label htmlFor="resetEndDate" className="floating-group__label">
                  Yeni Program Bitişi
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--danger settings-card__submit"
            onClick={handleSystemReset}
            disabled={isResetting}
          >
            {isResetting ? 'Sıfırlanıyor...' : 'Sistemi Sıfırla'}
          </button>
        </div>
      )}
    </PageShell>
  );
}

export default SettingsPage;
