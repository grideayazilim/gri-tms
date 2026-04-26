/* ========================================================================
   USER EDIT MODAL (KULLANICI DÜZENLEME MODALI)
   Mevcut bir kullanıcının rolünü, geçerlilik tarihini ve yetki alanını 
   (Yerleşke/Birim) günceller.
   ======================================================================== */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userEditSchema } from '../../../schemas/user.schema';
import { useLocationsAndUnits } from '../../../hooks/data/useLocationsAndUnits';
import { toISODateString } from '../../../utils/dateUtils';
import { USER_ROLE } from '@timesheet/shared';
import './UserEditModal.scss';


const UserEditModal = ({ user, onClose, onSave }) => {
  const { locations, units, fetchLocations, fetchUnitsByLocation } = useLocationsAndUnits();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      role: user?.role || '',
      expiryDate: toISODateString(user?.expiryDate),
      locationId: user?.unit?.location?.id?.toString() || '',
      unitId: user?.unit?.id?.toString() || '',
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
        role: user.role || '',
        expiryDate: toISODateString(user.expiryDate),
        locationId: user.unit?.location?.id?.toString() || '',
        unitId: user.unit?.id?.toString() || '',
      });
    }
  }, [user, reset]);

  const selectedLocationId = watch("locationId");
  const selectedUnitId = watch("unitId");

  const onSubmit = (data) => {
    onSave({
      role: data.role,
      // Tarih seçilmemişse veritabanına null gönderiyoruz (Süresiz kullanıcı)
      expiryDate: data.expiryDate || null,
      // Rol ADMIN ise yerleşke/birim null gönderilir
      locationId: data.locationId || null,
      unitId: data.unitId || null,
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
            {...register('locationId')}
            value={selectedLocationId}
            onChange={(e) => {
              const locId = e.target.value;
              setValue('locationId', locId, { shouldDirty: true });
              setValue('unitId', '', { shouldDirty: true });
              if (locId) fetchUnitsByLocation(locId);
            }}
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
            value={selectedUnitId}
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

      <div className="modal-form__actions">
        <button type="button" className="btn btn--secondary" onClick={() => onClose(null)}>
          Vazgeç
        </button>
        <button
          type="submit"
          className="btn"
          disabled={!isDirty}
        >
          Güncelle
        </button>
      </div>
    </form>
  );
};

export default UserEditModal;
