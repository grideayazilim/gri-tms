/* ========================================================================
   SETTINGS PAGE (AYARLAR SAYFASI)
   Hem kişisel profil (şifre/username) hem de global sistem ayarlarını yönetir.
   ======================================================================== */
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSettingsSchema, systemSettingsSchema, PASSWORD_RULE_TEXT } from "@timesheet/shared";
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
import { resetSystem as callResetSystem, downloadBackupZip } from "../../api/settingsService";
import { ResetConfirmContent, ResetSuccessContent, ResetFailureContent } from "./ResetDialogs/ResetDialogs";
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
  } = useForm<z.input<typeof loginSettingsSchema>, unknown, LoginSettingsType>({
    resolver: zodResolver(loginSettingsSchema),
    defaultValues: { username: user?.username ?? "", currentPassword: "", password: "" },
  });

  const onLoginSubmit = async (data: LoginSettingsType) => {
    const payload = {
      username: data.username,
      // Şifre alanları doluysa payload'a ekle
      ...(data.password ? { oldPassword: data.currentPassword, newPassword: data.password } : {})
    };

    const result = await editProfile(payload);
    if (result.success) {
      toast({ type: "success", message: "Giriş bilgileriniz güncellendi." });
      // AuthContext'i güncelle ki Navbar'daki isim anlık değişsin
      updateProfile({ username: result.data.user.username || data.username });
      // Formu temizle ve yeni kullanıcı adını default yap
      resetLogin({ username: result.data.user.username ?? data.username, currentPassword: "", password: "" });
    } else {
      toast({ type: "error", message: result.error || "Güncelleme başarısız." });
      // Eğer kullanıcı adı başkası tarafından alınmışsa (409 Conflict)
      if (result.code === '409' || result.error?.includes('kullanımda') || result.error?.includes('already in use')) {
        setLoginError('username', { type: 'manual', message: 'Bu kullanıcı adı zaten kullanımda.' });
      }
    }
  };


  const { showConfirm, showModal } = useModal();
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
  /* Yedek + sıfırlama iki ayrı adım; kullanıcı hangi adımda olduğunu görmeli. */
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetErrors, setResetErrors] = useState<{
    dailyWage?: string;
    weeklyDays?: string;
    startDate?: string;
    endDate?: string;
  }>({});

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
  } = useForm<z.input<typeof systemSettingsSchema>, unknown, SystemSettingsType>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      /* Varsayılan "0" idi; artık 0 geçersiz bir değer (tüm maaş çıktıları
         sessizce 0 TL üretiyordu). Boş string şemada null'a çevrilir — "henüz
         ayarlanmamış" durumu serbesttir. */
      dailyWage: "",
      maxWeeklyDays: "",
      programStartDate: "",
      programEndDate: "",
    },
  });

  const onSystemSubmit = async (data: SystemSettingsType) => {
    const norm = (v: string | number | null | undefined) => v === '' ? null : (v ?? null);
    const datesChanged =
      norm(systemSettings?.programStartDate) !== norm(data.programStartDate) ||
      norm(systemSettings?.programEndDate) !== norm(data.programEndDate);

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
    const errors: typeof resetErrors = {};
    const dailyWageNum = parseFloat(resetDailyWage);
    const weeklyDaysNum = parseInt(resetWeeklyDays, 10);

    if (!resetDailyWage) {
      errors.dailyWage = "Geçerli bir günlük ücret giriniz.";
    } else if (isNaN(dailyWageNum) || dailyWageNum <= 0) {
      errors.dailyWage = "Günlük ücret sıfırdan büyük bir sayı olmalıdır.";
    }

    if (!resetWeeklyDays) {
      errors.weeklyDays = "Geçerli bir haftalık gün sınırı giriniz.";
    } else if (isNaN(weeklyDaysNum) || weeklyDaysNum <= 0) {
      errors.weeklyDays = "Haftalık gün sınırı sıfırdan büyük bir sayı olmalıdır.";
    }

    if (!resetStartDate) {
      errors.startDate = "Lütfen program başlangıç tarihini giriniz.";
    }

    if (!resetEndDate) {
      errors.endDate = "Lütfen program bitiş tarihini giriniz.";
    } else if (resetStartDate && resetEndDate <= resetStartDate) {
      errors.endDate = "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.";
    }

    if (Object.keys(errors).length > 0) {
      setResetErrors(errors);
      return;
    }
    setResetErrors({});

    /* Genel "emin misiniz?" onayı kas hafızasıyla tıklanıyordu. Aynı
       modal artık silineceklerin listesini gösteriyor ve düğmeyi ancak
       SIFIRLA kelimesi birebir yazılınca açıyor. */
    const confirmed = await showModal<boolean>({
      title: 'Sistemi Sıfırla',
      size: 'small',
      content: (closeModal) => (
        <ResetConfirmContent
          deleteLocationsAndUnits={resetDeleteLocations}
          onClose={closeModal}
        />
      ),
    });
    if (!confirmed) return;

    setIsResetting(true);
    // Hata modalı "indirdiğiniz yedek geçerlidir" diyebilmek için bunu bilmeli
    let backupTaken = false;
    try {
      const wantsBackup = resetBackup === 'with';

      /* Yedek önce ve ayrı bir istekte alınır: iki kısa istek, tek uzun istek
         yerine. Yedek başarısız olursa hiçbir şey silinmez. */
      if (wantsBackup) {
        setResetStatus('Yedek hazırlanıyor, bu birkaç dakika sürebilir...');
        const blob = await downloadBackupZip();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sistem-yedegi-${timestamp}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        backupTaken = true;
      }

      setResetStatus('Sistem sıfırlanıyor...');
      const response = await callResetSystem({
        backup: false,
        deleteLocationsAndUnits: resetDeleteLocations,
        newSettings: {
          dailyWage: dailyWageNum,
          maxWeeklyDays: weeklyDaysNum,
          programStartDate: resetStartDate,
          programEndDate: resetEndDate,
        },
      });

      /* Geri dönüşü olmayan bir işlemin sonucu kalıcı modalda gösterilir; toast
         kullanıcı okumadan kaybolurdu. Çıkış, kullanıcı "Tamam"a basınca yapılır. */
      const deleted = response.success
        ? response.data.deleted
        : { employees: 0, users: 0, periods: 0 };

      await showModal<boolean>({
        title: 'Sistem sıfırlandı',
        size: 'small',
        showCloseButton: false,
        content: (closeModal) => (
          <ResetSuccessContent deleted={deleted} onClose={closeModal} />
        ),
      });

      // Admin olmayan tüm session'lar geçersiz oldu; tutarlı başlangıç için logout yap
      void logout();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sistem sıfırlanamadı.';
      const status = (err as { status?: number })?.status ?? null;

      await showModal<boolean>({
        title: 'Sistem sıfırlanamadı',
        size: 'small',
        content: (closeModal) => (
          <ResetFailureContent
            serverMessage={message}
            status={status}
            backupTaken={backupTaken}
            onClose={closeModal}
          />
        ),
      });
    } finally {
      setIsResetting(false);
      setResetStatus(null);
    }
  };

  useEffect(() => {
    if (systemSettings) {
      resetSystem({
        // Ayarlanmamış değer "0" değil boş gelir (bkz. defaultValues)
        dailyWage: systemSettings.dailyWage?.toString() ?? "",
        maxWeeklyDays: systemSettings.maxWeeklyDays?.toString() ?? "",
        programStartDate: toISODateString(systemSettings.programStartDate) ?? "",
        programEndDate: toISODateString(systemSettings.programEndDate) ?? "",
      });
    }
  }, [systemSettings, resetSystem]);

  return (
    <PageShell
      title="Ayarlar"
      infoVideos={{
        modalTitle: 'Ayarlar Nasıl Kullanılır?',
        byRole: {
          ADMIN: [
            { src: '/video-guides/ayarlar_kayit_onaylama.mp4', title: 'Kayıt Onaylama' },
            { src: '/video-guides/ayarlar_sifirlama.mp4', title: 'Şifre Sıfırlama' },
          ],
        },
      }}
    >
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
            id="currentPassword"
            className={`input ${loginErrors.currentPassword ? 'input--error' : ''}`}
            placeholder=" "
            {...loginRegister('currentPassword')}
          />
          <label htmlFor="currentPassword" className="floating-group__label">
            Mevcut Şifre
          </label>
          {loginErrors.currentPassword && (
            <span className="input-error-message">{loginErrors.currentPassword.message}</span>
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
            Yeni Şifre
          </label>
          {/* Metin gerçek şifre politikasından okunur, elle yazılmaz */}
          <span className="input-rule-hint">{PASSWORD_RULE_TEXT}</span>
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
            id="dailyWage"
            className={`input ${systemErrors.dailyWage ? 'input--error' : ''}`}
            placeholder=" "
            {...systemRegister('dailyWage')}
          />
          <label htmlFor="dailyWage" className="floating-group__label">
            Günlük Ödenek (₺)
          </label>
          {systemErrors.dailyWage && (
            <span className="input-error-message">{systemErrors.dailyWage.message}</span>
          )}
        </div>

        <div className="floating-group">
          <input
            type="text"
            inputMode="numeric"
            id="maxWeeklyDays"
            className={`input ${systemErrors.maxWeeklyDays ? 'input--error' : ''}`}
            placeholder=" "
            {...systemRegister('maxWeeklyDays')}
          />
          <label htmlFor="maxWeeklyDays" className="floating-group__label">
            Haftalık Çalışma Sınırı (Gün)
          </label>
          {systemErrors.maxWeeklyDays && (
            <span className="input-error-message">{systemErrors.maxWeeklyDays.message}</span>
          )}
        </div>

        <div className="settings-row">
          <div className="floating-group">
            <input
              type="date"
              id="programStartDate"
              className={`input ${systemErrors.programStartDate ? 'input--error' : ''}`}
              placeholder=" "
              {...systemRegister('programStartDate')}
            />
            <label htmlFor="programStartDate" className="floating-group__label">
              Program Başlangıç
            </label>
            {systemErrors.programStartDate && (
              <span className="input-error-message">{systemErrors.programStartDate.message}</span>
            )}
          </div>

          <div className="floating-group">
            <input
              type="date"
              id="programEndDate"
              className={`input ${systemErrors.programEndDate ? 'input--error' : ''}`}
              placeholder=" "
              {...systemRegister('programEndDate')}
            />
            <label htmlFor="programEndDate" className="floating-group__label">
              Program Bitiş
            </label>
            {systemErrors.programEndDate && (
              <span className="input-error-message">{systemErrors.programEndDate.message}</span>
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
              İşaretlenirse tüm yerleşke ve birim verileri de temizlenir.
            </p>

            <div className="settings-row">
              <div className="floating-group">
                <input
                  type="text"
                  inputMode="decimal"
                  id="resetDailyWage"
                  className={`input ${resetErrors.dailyWage ? 'input--error' : ''}`}
                  placeholder=" "
                  value={resetDailyWage}
                  onChange={(e) => {
                    setResetDailyWage(e.target.value);
                    if (resetErrors.dailyWage) {
                      setResetErrors((prev) => ({ ...prev, dailyWage: undefined }));
                    }
                  }}
                />
                <label htmlFor="resetDailyWage" className="floating-group__label">
                  Günlük Ödenek (₺)
                </label>
                {resetErrors.dailyWage && (
                  <span className="input-error-message">{resetErrors.dailyWage}</span>
                )}
              </div>

              <div className="floating-group">
                <input
                  type="text"
                  inputMode="numeric"
                  id="resetWeeklyDays"
                  className={`input ${resetErrors.weeklyDays ? 'input--error' : ''}`}
                  placeholder=" "
                  value={resetWeeklyDays}
                  onChange={(e) => {
                    setResetWeeklyDays(e.target.value);
                    if (resetErrors.weeklyDays) {
                      setResetErrors((prev) => ({ ...prev, weeklyDays: undefined }));
                    }
                  }}
                />
                <label htmlFor="resetWeeklyDays" className="floating-group__label">
                  Haftalık Çalışma Sınırı (Gün)
                </label>
                {resetErrors.weeklyDays && (
                  <span className="input-error-message">{resetErrors.weeklyDays}</span>
                )}
              </div>
            </div>

            <div className="mini-gap"></div>

            <div className="settings-row">
              <div className="floating-group">
                <input
                  type="date"
                  id="resetStartDate"
                  className={`input ${resetErrors.startDate ? 'input--error' : ''}`}
                  placeholder=" "
                  value={resetStartDate}
                  onChange={(e) => {
                    setResetStartDate(e.target.value);
                    if (resetErrors.startDate) {
                      setResetErrors((prev) => ({ ...prev, startDate: undefined }));
                    }
                  }}
                />
                <label htmlFor="resetStartDate" className="floating-group__label">
                  Yeni Program Başlangıcı
                </label>
                {resetErrors.startDate && (
                  <span className="input-error-message">{resetErrors.startDate}</span>
                )}
              </div>

              <div className="floating-group">
                <input
                  type="date"
                  id="resetEndDate"
                  className={`input ${resetErrors.endDate ? 'input--error' : ''}`}
                  placeholder=" "
                  value={resetEndDate}
                  onChange={(e) => {
                    setResetEndDate(e.target.value);
                    if (resetErrors.endDate) {
                      setResetErrors((prev) => ({ ...prev, endDate: undefined }));
                    }
                  }}
                />
                <label htmlFor="resetEndDate" className="floating-group__label">
                  Yeni Program Bitişi
                </label>
                {resetErrors.endDate && (
                  <span className="input-error-message">{resetErrors.endDate}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn--danger settings-card__submit"
            onClick={handleSystemReset}
            disabled={isResetting}
          >
            {isResetting ? (resetStatus ?? 'Sıfırlanıyor...') : 'Sistemi Sıfırla'}
          </button>
        </div>
      )}
    </PageShell>
  );
}

export default SettingsPage;
