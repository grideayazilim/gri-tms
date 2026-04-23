import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userEditSchema } from '../../../schemas/user.schema';
import { useLocationsAndUnits } from '../../../hooks/data/useLocationsAndUnits';
import './UserEditModal.scss';

const getLocalDateString = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
      validityDate: getLocalDateString(user?.expiryDate),
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
        validityDate: getLocalDateString(user.expiryDate),
        locationId: user.unit?.location?.id?.toString() || '',
        unitId: user.unit?.id?.toString() || '',
      });
    }
  }, [user, reset]);

  const onSubmit = (data) => {
    onSave({
      role: data.role,
      expiryDate: data.validityDate || null,
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
            <option value="ADMIN">Admin</option>
            <option value="RESPONSIBLE">Sorumlu</option>
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
            id="validityDate"
            className={`input ${errors.validityDate ? 'input--error' : ''}`}
            placeholder=" "
            {...register('validityDate')}
          />
          <label htmlFor="validityDate" className="floating-group__label">
            Geçerlilik Tarihi
          </label>
          {errors.validityDate && (
            <span className="input-error-message">{errors.validityDate.message}</span>
          )}
        </div>
      </div>

      <div className="settings-row">
         <div className="floating-group">
          <select
            id="locationId"
            className={`input ${errors.locationId ? 'input--error' : ''}`}
            // Standart register yerine e.target.value ataması yapıp alt menüyü boşaltalım
            {...register('locationId')}
            onChange={(e) => {
              const locId = e.target.value;
              setValue('locationId', locId, { shouldDirty: true });
              setValue('unitId', '', { shouldDirty: true });
              if (locId) fetchUnitsByLocation(locId);
            }}
          >
            <option value="" disabled hidden></option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
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
              <option key={unit.id} value={unit.id}>{unit.name}</option>
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

      <div className="modal-form__actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
        <button type="button" className="btn" onClick={() => onClose(null)}>
          Vazgeç
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!isDirty}
        >
          Güncelle
        </button>
      </div>
    </form>
  );
};

export default UserEditModal;
