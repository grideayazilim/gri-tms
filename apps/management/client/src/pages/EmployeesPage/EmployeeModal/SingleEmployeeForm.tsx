import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { employeeSchema, formatPhoneAsTyped, FORMATTED_PHONE_LENGTH } from '@timesheet/shared';
import type { EmployeeType, EmployeeListItem, Result } from '@timesheet/shared';
import { useLocationsAndUnits } from '../../../hooks/data/useLocationsAndUnits';
import { toISODateString } from '../../../utils/dateUtils';

interface SingleEmployeeFormProps {
  employee?: EmployeeListItem | undefined;
  onClose: () => void;
  onSave: (data: EmployeeType) => Promise<Result<unknown>>;
}

const SingleEmployeeForm = ({ employee, onClose, onSave }: SingleEmployeeFormProps) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { locations, units, fetchLocations, fetchUnitsByLocation } = useLocationsAndUnits();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof employeeSchema>, undefined, EmployeeType>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      tcNo: employee?.tcNo ?? '',
      firstName: employee?.firstName ?? '',
      lastName: employee?.lastName ?? '',
      locationId: employee?.unit?.location?.id?.toString() ?? '',
      unitId: employee?.unit?.id?.toString() ?? '',
      startDate: toISODateString(employee?.startDate) ?? '',
      endDate: toISODateString(employee?.endDate) ?? '',
      ibanNo: employee?.ibanNo ?? '',
      phoneNo: employee?.phoneNo ?? '',
      isActive: employee?.isActive ?? true,
    },
  });

  const selectedLocationId = watch('locationId');

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (employee?.unit?.location?.id) {
      fetchUnitsByLocation(employee.unit.location.id);
    }
  }, [employee, fetchUnitsByLocation]);

  const onSubmit = async (data: EmployeeType) => {
    setApiError(null);
    setIsSaving(true);
    try {
      const payload: EmployeeType = {
        tcNo: data.tcNo,
        firstName: data.firstName,
        lastName: data.lastName,
        locationId: data.locationId,
        unitId: data.unitId,
        startDate: data.startDate,
        endDate: data.isActive ? null : data.endDate || null,
        ibanNo: data.ibanNo,
        phoneNo: data.phoneNo,
        isActive: data.isActive,
      };
      const result = await onSave(payload);
      if (result && result.success === false) {
        setApiError(result.error || 'Çalışan kaydedilemedi');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'İşlem sırasında bir hata oluştu';
      setApiError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="settings-row">
        <div className="floating-group flex-full">
          <input
            type="text"
            id="tcNo"
            className={`input ${errors.tcNo ? 'input--error' : ''}`}
            placeholder=" "
            maxLength={11}
            {...register('tcNo')}
          />
          <label htmlFor="tcNo" className="floating-group__label">TC No</label>
          {errors.tcNo && <span className="input-error-message">{errors.tcNo.message}</span>}
        </div>
      </div>

      <div className="settings-row">
        <div className="floating-group">
          <input
            type="text"
            id="firstName"
            className={`input ${errors.firstName ? 'input--error' : ''}`}
            placeholder=" "
            {...register('firstName', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                e.target.value = e.target.value.toLocaleUpperCase('tr-TR');
              },
            })}
          />
          <label htmlFor="firstName" className="floating-group__label">Ad</label>
          {errors.firstName && <span className="input-error-message">{errors.firstName.message}</span>}
        </div>
        <div className="floating-group">
          <input
            type="text"
            id="lastName"
            className={`input ${errors.lastName ? 'input--error' : ''}`}
            placeholder=" "
            {...register('lastName', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                e.target.value = e.target.value.toLocaleUpperCase('tr-TR');
              },
            })}
          />
          <label htmlFor="lastName" className="floating-group__label">Soyad</label>
          {errors.lastName && <span className="input-error-message">{errors.lastName.message}</span>}
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
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id.toString()}>{loc.name}</option>
            ))}
          </select>
          <label htmlFor="locationId" className="floating-group__label">Yerleşke</label>
          {errors.locationId && <span className="input-error-message">{errors.locationId.message}</span>}
        </div>
        <div className="floating-group">
          <select
            id="unitId"
            className={`input ${errors.unitId ? 'input--error' : ''}`}
            {...register('unitId')}
            disabled={!selectedLocationId}
          >
            <option value="" disabled hidden></option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id.toString()}>{unit.name}</option>
            ))}
          </select>
          <label htmlFor="unitId" className="floating-group__label">Birim</label>
          {errors.unitId && <span className="input-error-message">{errors.unitId.message}</span>}
        </div>
      </div>

      <div className="settings-row">
        <div className="floating-group">
          <input
            type="date"
            id="startDate"
            className={`input ${errors.startDate ? 'input--error' : ''}`}
            {...register('startDate')}
          />
          <label htmlFor="startDate" className="floating-group__label">İşe Giriş</label>
          {errors.startDate && <span className="input-error-message">{errors.startDate.message}</span>}
        </div>
        <div className="floating-group">
          <input
            type="date"
            id="endDate"
            className={`input ${errors.endDate ? 'input--error' : ''}`}
            disabled={watch('isActive')}
            {...register('endDate')}
          />
          <label htmlFor="endDate" className="floating-group__label">İşten Çıkış</label>
          {errors.endDate && <span className="input-error-message">{errors.endDate.message}</span>}
        </div>
      </div>

      <div className="isActive-checkbox">
        <input type="checkbox" id="isActiveCheck" {...register('isActive')} />
        <label htmlFor="isActiveCheck">Çalışmaya devam ediyor mu?</label>
      </div>

      <div className="settings-row">
        <div className="floating-group flex-full">
          <input
            type="tel"
            id="phoneNo"
            className={`input ${errors.phoneNo ? 'input--error' : ''}`}
            placeholder=" 0555 555 4455"
            maxLength={FORMATTED_PHONE_LENGTH}
            {...register('phoneNo', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                e.target.value = formatPhoneAsTyped(e.target.value);
              },
            })}
          />
          <label htmlFor="phoneNo" className="floating-group__label">Telefon No</label>
          {errors.phoneNo && <span className="input-error-message">{errors.phoneNo.message}</span>}
        </div>
      </div>

      <div className="settings-row">
        <div className="floating-group flex-full">
          <input
            type="text"
            id="ibanNo"
            className={`input ${errors.ibanNo ? 'input--error' : ''}`}
            placeholder=" TR..."
            {...register('ibanNo')}
          />
          <label htmlFor="ibanNo" className="floating-group__label">IBAN</label>
          {errors.ibanNo && <span className="input-error-message">{errors.ibanNo.message}</span>}
        </div>
      </div>

      {apiError && <div className="api-error-alert">{apiError}</div>}

      <div className="modal-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Vazgeç</button>
        <button type="submit" className="btn" disabled={isSaving || (!!employee && !isDirty)}>
          {isSaving ? 'Kaydediliyor...' : employee ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
};

export default SingleEmployeeForm;
