import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userEditSchema } from '@timesheet/shared';
import { useLocationsAndUnits } from '../../../hooks/data/useLocationsAndUnits';
import { toISODateString } from '../../../utils/dateUtils';
import { USER_ROLE } from '@timesheet/shared';
import type { UserListItem, UserEditType } from '@timesheet/shared';
import './UserEditModal.scss';

interface UserEditModalProps {
  user: UserListItem;
  onClose: (data: null) => void;
  onSave: (data: UserEditType) => void;
}

const UserEditModal = ({ user, onClose, onSave }: UserEditModalProps) => {
  const { locations, units, fetchLocations, fetchUnitsByLocation } = useLocationsAndUnits();

  // Şifre sıfırlama bölümü için yerel state (sadece checkbox kontrolü)
  const [changePassword, setChangePassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
    reset,
    resetField,
  } = useForm<UserEditType>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      role: user?.role,
      expiryDate: toISODateString(user?.expiryDate) ?? '',
      locationId: user?.unit?.location?.id?.toString() ?? '',
      unitId: user?.unit?.id?.toString() ?? '',
    },
  });

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (user?.unit?.location?.id) {
      fetchUnitsByLocation(user.unit.location.id);
    }
  }, [user, fetchUnitsByLocation]);

  useEffect(() => {
    if (user) {
      reset({
        role: user.role,
        expiryDate: toISODateString(user.expiryDate) ?? '',
        locationId: user.unit?.location?.id?.toString() ?? '',
        unitId: user.unit?.id?.toString() ?? '',
      });
      // Kullanıcı değiştiğinde şifre alanını sıfırla
      setChangePassword(false);
    }
  }, [user, reset]);


  const onSubmit = (data: UserEditType) => {
    onSave({
      role: data.role,
      // Tarih seçilmemişse veritabanına null gönderiyoruz (Süresiz kullanıcı)
      expiryDate: data.expiryDate || null,
      // Rol ADMIN ise yerleşke/birim null gönderilir
      locationId: data.locationId || null,
      unitId: data.unitId || null,
      // Checkbox işaretli ve schema'dan gelen değer varsa ekle
      ...(changePassword && data.forceNewPassword ? { forceNewPassword: data.forceNewPassword } : {}),
    });
  };


  return (
    <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="settings-row">
        <div className="floating-group">
          <select
            id="role"
            className={`input ${errors.role ? 'input--error' : ''}`}
            {...register('role')}
          >
            <option value="" disabled hidden></option>
            <option value={USER_ROLE.ADMIN}>Admin</option>
            <option value={USER_ROLE.RESPONSIBLE}>Sorumlu</option>
          </select>
          <label htmlFor="role" className="floating-group__label">
            Rol
          </label>
          {errors.role && (
            <span className="input-error-message">{errors.role.message}</span>
          )}
        </div>

        <div className="floating-group">
          <input
            type="date"
            id="expiryDate"
            className={`input ${errors.expiryDate ? 'input--error' : ''}`}
            placeholder=" "
            {...register('expiryDate')}
          />
          <label htmlFor="expiryDate" className="floating-group__label">
            Geçerlilik Tarihi
          </label>
          {errors.expiryDate && (
            <span className="input-error-message">{errors.expiryDate.message}</span>
          )}
        </div>
      </div>

      <div className="settings-row">
         <div className="floating-group">
          <select
            id="locationId"
            className={`input ${errors.locationId ? 'input--error' : ''}`}
            {...register('locationId', {
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                const locId = e.target.value;
                setValue('unitId', '', { shouldDirty: true });
                if (locId) fetchUnitsByLocation(locId);
              },
            })}
          >
            <option value="" disabled hidden></option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id.toString()}>{loc.name}</option>
            ))}
          </select>
          <label htmlFor="locationId" className="floating-group__label">
            Yerleşke
          </label>
          {errors.locationId && (
            <span className="input-error-message">{errors.locationId.message}</span>
          )}
        </div>

        <div className="floating-group">
          <select
            id="unitId"
            className={`input ${errors.unitId ? 'input--error' : ''}`}
            {...register('unitId')}
          >
            <option value="" disabled hidden></option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id.toString()}>{unit.name}</option>
            ))}
          </select>
          <label htmlFor="unitId" className="floating-group__label">
            Birim
          </label>
          {errors.unitId && (
            <span className="input-error-message">{errors.unitId.message}</span>
          )}
        </div>
      </div>

      {/* ─── ŞİFRE SIFIRLAMA ─────────────────────────────────────────── */}
      <hr className="modal-form__divider" />
      <div className="modal-form__password-reset">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={changePassword}
            onChange={(e) => {
              setChangePassword(e.target.checked);
              if (!e.target.checked) {
                resetField('forceNewPassword');
              }
            }}
          />
          <span>Şifreyi değiştir</span>
        </label>

        {changePassword && (
          <div className="floating-group" style={{ marginTop: '8px' }}>
            <input
              type="password"
              id="forceNewPassword"
              className={`input ${errors.forceNewPassword ? 'input--error' : ''}`}
              placeholder=" "
              {...register('forceNewPassword')}
            />
            <label htmlFor="forceNewPassword" className="floating-group__label">
              Yeni şifre (en az 8 karakter)
            </label>
            {errors.forceNewPassword && (
              <span className="input-error-message">{errors.forceNewPassword.message}</span>
            )}
          </div>
        )}
      </div>

      <div className="modal-form__actions">
        <button type="button" className="btn btn--secondary" onClick={() => onClose(null)}>
          Vazgeç
        </button>
        <button
          type="submit"
          className="btn"
          disabled={!isDirty && !changePassword}
        >
          Güncelle
        </button>
      </div>
    </form>
  );
};

export default UserEditModal;
