import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userEditSchema } from '../../../schemas/user.schema';
import './UserEditModal.scss';

const UserEditModal = ({ user, onClose, onSave }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      role: user?.role || '',
      validityDate: user?.lastLogin || '', // Map lastLogin for now as validity date
      location: user?.location || '',
      unit: user?.unit || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        role: user.role || '',
        validityDate: user.lastLogin || '', // Map lastLogin for now as validity date
        location: user.location || '',
        unit: user.unit || '',
      });
    }
  }, [user, reset]);

  const onSubmit = (data) => {
    onSave(data);
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
            id="location"
            className={`input ${errors.location ? 'input--error' : ''}`}
            {...register('location')}
          >
            <option value="" disabled hidden></option>
            <option value="Merkez Kampüs">Merkez Kampüs</option>
            <option value="Kuzey Kampüs">Kuzey Kampüs</option>
          </select>
          <label htmlFor="location" className="floating-group__label">
            Yerleşke
          </label>
          {errors.location && (
            <span className="input-error-message">{errors.location.message}</span>
          )}
        </div>

        <div className="floating-group">
          <select
            id="unit"
            className={`input ${errors.unit ? 'input--error' : ''}`}
            {...register('unit')}
          >
            <option value="" disabled hidden></option>
            <option value="Bilgisayar Mühendisliği">Bilgisayar Mühendisliği</option>
            <option value="Yazılım Mühendisliği">Yazılım Mühendisliği</option>
          </select>
          <label htmlFor="unit" className="floating-group__label">
            Birim
          </label>
          {errors.unit && (
            <span className="input-error-message">{errors.unit.message}</span>
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
