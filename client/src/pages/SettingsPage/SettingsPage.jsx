import { useEffect, useCallback, useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { RxDragHandleDots2 } from "react-icons/rx";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSettingsSchema, systemSettingsSchema, markerSettingsSchema } from "../../schemas/settings.schema";
import "../../styles/inputs.scss";
import PageShell from "../../components/PageShell/PageShell";
import PendingUserList from "./PendingUserList/PendingUserList";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../components/Modal";
import { useToast } from "../../components/ToastBar/ToastContext";
import { useSettings } from "../../hooks/data/useSettings";
import { useUsers } from "../../hooks/data/useUsers";
import "./SettingsPage.scss";

// ── Draggable Marker Row ──────────────────────────────────────────────────────
function SortableMarkerItem({ id, index, register, markerErrors, remove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="marker-item" ref={setNodeRef} style={style}>
      <button
        type="button"
        className="marker-item__drag-handle"
        {...attributes}
        {...listeners}
        tabIndex={-1}
        title="Sürükle"
      >
        <RxDragHandleDots2 />
      </button>

      <div className="floating-group marker-item__code">
        <input
          type="text"
          className={`input input--center ${markerErrors?.markers?.[index]?.code ? 'input--error' : ''}`}
          placeholder=" "
          maxLength={3}
          {...register(`markers.${index}.code`)}
        />
        <label className="floating-group__label">Kod</label>
        {markerErrors?.markers?.[index]?.code && (
          <span className="input-error-message">{markerErrors.markers[index].code.message}</span>
        )}
      </div>

      <div className="floating-group marker-item__label">
        <input
          type="text"
          className={`input ${markerErrors?.markers?.[index]?.label ? 'input--error' : ''}`}
          placeholder=" "
          {...register(`markers.${index}.label`)}
        />
        <label className="floating-group__label">Açıklama</label>
        {markerErrors?.markers?.[index]?.label && (
          <span className="input-error-message">{markerErrors.markers[index].label.message}</span>
        )}
      </div>

      <label className="checkbox-label marker-item__paid">
        <input
          type="checkbox"
          {...register(`markers.${index}.isPaid`)}
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
  );
}

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

  const onLoginSubmit = async (data) => {
    const payload = { 
      username: data.username,
      ...(data.password ? { newPassword: data.password } : {}) 
    };

    const result = await editProfile(payload);
    if (result.success) {
      toast({ type: "success", message: "Giriş bilgileriniz güncellendi." });
      updateProfile({ username: result.data?.username || data.username });
      resetLogin({ username: result.data?.username || data.username, password: "" });
    } else {
      toast({ type: "error", message: result.error || "Güncelleme başarısız." });
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
    markers,
    fetchMarkers,
    updateSystemSettings,
    updateMarkers: updateMarkersApi,
    reorderMarkers
  } = useSettings();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Onay bekleyen kullanıcı işlemleri
  const { 
    users: pendingUsers, 
    fetchUsers: fetchPendingUsers, 
    editProfile, 
    editUser: approveUser, 
    removeUser: rejectUser 
  } = useUsers();

  useEffect(() => {
    if (isAdmin()) {
      fetchPendingUsers({ status: 'PENDING' });
    }
  }, [isAdmin, fetchPendingUsers]);

  const handleApprove = async (userId) => {
    const result = await approveUser(userId, { status: 'ACTIVE' });
    if (result.success) {
      toast({ type: "success", message: "Kullanıcı başarıyla onaylandı." });
      fetchPendingUsers({ status: 'PENDING' });
    } else {
      toast({ type: "error", message: result.error || "Kullanıcı onaylanamadı." });
    }
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
      const result = await rejectUser(userId);
      if (result.success) {
        toast({ type: "success", message: "Kullanıcı reddedildi ve silindi." });
        fetchPendingUsers({ status: 'PENDING' });
      } else {
        toast({ type: "error", message: result.error || "Kullanıcı reddedilemedi." });
      }
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
    },
  });

  const onSystemSubmit = async (data) => {
    const result = await updateSystemSettings(data);
    if (result.success) {
      toast({ type: "success", message: "Sistem ayarları güncellendi." });
      resetSystem(data);
    } else {
      if (result.code === 'CONFIRM_PERIOD_CHANGE') {
        const confirmed = await showConfirm({
          title: 'Tarih Değişimi Onayı',
          message: 'Program tarihleri değiştiğinde mevcut dönemler silinip yeniden oluşturulacaktır. Yeni tarih aralığı dışında kalan aylara ait veriler silinebilir. Bu işlemi onaylıyor musunuz?',
          type: 'warning',
          confirmText: 'Onayla ve Güncelle',
          cancelText: 'Vazgeç',
        });
        if (confirmed) {
          const forceResult = await updateSystemSettings({ ...data, force: true });
          if (forceResult.success) {
            toast({ type: "success", message: "Sistem ayarları güncellendi ve dönemler yeniden oluşturuldu." });
            resetSystem(data);
          } else {
            toast({ type: "error", message: forceResult.error });
          }
        }
      } else {
        toast({ type: "error", message: result.error });
      }
    }
  };

  // PUANTAJ İŞARETÇİLERİ FORM
  const {
    register: markerRegister,
    control: markerControl,
    handleSubmit: handleMarkerSubmit,
    formState: { errors: markerErrors, isDirty: isMarkerDirty },
    reset: resetMarker,
  } = useForm({
    resolver: zodResolver(markerSettingsSchema),
    defaultValues: {
      markers: [
        { code: "X", label: "Geldi", isPaid: true },
        { code: "İ", label: "İzinli", isPaid: false },
        { code: "R", label: "Raporlu", isPaid: false },
        { code: "DT", label: "Devlet Tatili", isPaid: true },
        { code: "RT", label: "Resmi Tatil", isPaid: true },
      ],
    },
  });

  const { fields: markerFields, append, remove, move } = useFieldArray({
    control: markerControl,
    name: "markers",
  });

  const [isOrderDirty, setIsOrderDirty] = useState(false);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = markerFields.findIndex(f => f.id === active.id);
    const newIndex = markerFields.findIndex(f => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Move items in the form field array
    move(oldIndex, newIndex);

    // Optimistic reorder: rebuild based on the new field order
    const reordered = arrayMove(markers, oldIndex, newIndex);
    const result = await reorderMarkers(reordered);
    if (!result.success) {
      toast({ type: 'error', message: result.error || 'Sıralama kaydedilemedi' });
    } else {
      setIsOrderDirty(true);
    }
  }, [markerFields, markers, move, reorderMarkers, toast]);

  const onMarkerSubmit = async (data) => {
    const result = await updateMarkersApi(data.markers);
    if (result.success) {
      toast({ type: "success", message: "İşaretçiler başarıyla güncellendi." });
      resetMarker(data);
      setIsOrderDirty(false);
    } else {
      toast({ type: "error", message: result.error });
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchSystemSettings();
      fetchMarkers();
    }
  }, [isAdmin, fetchSystemSettings, fetchMarkers]);

  useEffect(() => {
    if (systemSettings) {
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split('T')[0];
      };
      
      resetSystem({
        dailyAllowance: systemSettings.dailyAllowance || "",
        weeklyLimit: systemSettings.weeklyLimit || "",
        programStart: formatDate(systemSettings.programStart),
        programEnd: formatDate(systemSettings.programEnd)
      });
    }
  }, [systemSettings, resetSystem]);

  useEffect(() => {
    if (markers && markers.length > 0) {
      resetMarker({ markers });
    }
  }, [markers, resetMarker]);

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
            step="0.01"
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

        <button
          type="submit"
          className="btn btn--primary settings-card__submit"
          disabled={!isSystemDirty}
        >
          Sistem Ayarlarını Güncelle
        </button>
      </form>
      )}

      {/* --- PUANTAJ İŞARETÇİLERİ --- */}
      {isAdmin() && (
        <form className="settings-card" onSubmit={handleMarkerSubmit(onMarkerSubmit)}>
          <h2 className="settings-card__title">Puantaj İşaretçileri</h2>
          
          <div className="marker-section">
            <div className="marker-list">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={markerFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {markerFields.map((field, index) => (
                    <SortableMarkerItem
                      key={field.id}
                      id={field.id}
                      index={index}
                      register={markerRegister}
                      markerErrors={markerErrors}
                      remove={remove}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {markerErrors.markers && !Array.isArray(markerErrors.markers) && (
                <span className="input-error-message">{markerErrors.markers.message}</span>
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
            disabled={!isMarkerDirty && !isOrderDirty}
          >
            İşaretçileri Güncelle
          </button>
        </form>
      )}
    </PageShell>
  );
}

export default SettingsPage;

