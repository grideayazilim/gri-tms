import { useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSettingsSchema, systemSettingsSchema } from "../../schemas/settings.schema";
import "../../styles/inputs.scss";
import PageShell from "../../components/PageShell/PageShell";
import PendingUserList from "./PendingUserList/PendingUserList";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../components/Modal";
import "./SettingsPage.scss";

function SettingsPage() {
  // GİRİŞ BİLGİLERİ FORM
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isDirty: isLoginDirty },
    reset: resetLogin,
  } = useForm({
    resolver: zodResolver(loginSettingsSchema),
    defaultValues: { username: "", password: "" },
  });

  const onLoginSubmit = (data) => {
    console.log("Login Info Saved", data);
    // After successful save:
    resetLogin(data);
  };

  const { isAdmin } = useAuth();
  const { showConfirm } = useModal();

  // Mock data for pending users
  const [pendingUsers, setPendingUsers] = useState([
    {
      id: 3,
      username: 'pending_user',
      role: 'RESPONSIBLE',
      status: 'PENDING',
      location: 'Kuzey Kampüs',
      unit: 'Yazılım Mühendisliği',
      lastLogin: null,
      createdAt: '2024-02-18',
    },
  ]);

  const handleApprove = (userId) => {
    setPendingUsers(pendingUsers.filter(u => u.id !== userId));
  };

  const handleReject = async (userId) => {
    const confirmed = await showConfirm({
      title: 'Kullanıcıyı Reddet',
      message: 'Adayı reddetmek istediğinizden emin misiniz?',
      type: 'danger',
      confirmText: 'Reddet',
      cancelText: 'Vazgeç',
    });

    if (confirmed) {
       setPendingUsers(pendingUsers.filter(u => u.id !== userId));
    }
  };

  // SİSTEM BİLGİLERİ FORM
  const {
    register: systemRegister,
    control: systemControl,
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
      markers: [
        { code: "X", label: "Geldi", isPaid: true },
        { code: "İ", label: "İzinli", isPaid: false },
        { code: "R", label: "Raporlu", isPaid: false },
        { code: "DT", label: "Devlet Tatili", isPaid: true },
        { code: "RT", label: "Resmi Tatil", isPaid: true },
      ],
    },
  });

  const { fields: markerFields, append, remove } = useFieldArray({
    control: systemControl,
    name: "markers",
  });

  const onSystemSubmit = (data) => {
    console.log("System Info Saved", data);
    // After successful save:
    resetSystem(data);
  };

  return (
    <PageShell title="Ayarlar">
      {isAdmin() && (
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
          className="btn btn--primary settings-card__submit"
          disabled={!isLoginDirty}
        >
          Giriş Bilgilerini Güncelle
        </button>
      </form>

      {/* --- SİSTEM BİLGİLERİ --- */}
      {isAdmin() && (
        <form className="settings-card" onSubmit={handleSystemSubmit(onSystemSubmit)}>
          <h2 className="settings-card__title">Sistem Ayarları</h2>

        <div className="floating-group">
          <input
            type="number"
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
            type="number"
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

        {/* --- PUANTAJ İŞARETÇİLERİ --- */}
        <div className="marker-section">
          <h3 className="marker-section__title">Puantaj İşaretçileri</h3>

          <div className="marker-list">
            {markerFields.map((field, index) => (
              <div className="marker-item" key={field.id}>
                <div className="floating-group marker-item__code">
                  <input
                    type="text"
                    className={`input input--center ${systemErrors?.markers?.[index]?.code ? 'input--error' : ''}`}
                    placeholder=" "
                    maxLength={3}
                    {...systemRegister(`markers.${index}.code`)}
                  />
                  <label className="floating-group__label">Kod</label>
                  {systemErrors?.markers?.[index]?.code && (
                    <span className="input-error-message">{systemErrors.markers[index].code.message}</span>
                  )}
                </div>

                <div className="floating-group marker-item__label">
                  <input
                    type="text"
                    className={`input ${systemErrors?.markers?.[index]?.label ? 'input--error' : ''}`}
                    placeholder=" "
                    {...systemRegister(`markers.${index}.label`)}
                  />
                  <label className="floating-group__label">Açıklama</label>
                  {systemErrors?.markers?.[index]?.label && (
                    <span className="input-error-message">{systemErrors.markers[index].label.message}</span>
                  )}
                </div>

                <label className="checkbox-label marker-item__paid">
                  <input
                    type="checkbox"
                    {...systemRegister(`markers.${index}.isPaid`)}
                  />
                  <span>Ücretli</span>
                </label>

                <button
                  type="button"
                  className="btn btn--danger btn--icon-only"
                  onClick={() => remove(index)}
                  title="Sil"
                >
                  <RiDeleteBinLine />
                </button>
              </div>
            ))}

            {systemErrors.markers && !Array.isArray(systemErrors.markers) && (
              <span className="input-error-message">{systemErrors.markers.message}</span>
            )}

            <button
              type="button"
              className="add-marker-btn"
              onClick={() => append({ code: "", label: "", isPaid: true })}
            >
              + Yeni İşaretçi Ekle
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--primary settings-card__submit"
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

