import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema } from '../../../schemas/employee.schema';
import { FiUploadCloud } from 'react-icons/fi';
import './EmployeeModal.scss';

const EmployeeModal = ({ employee, mode = 'SINGLE', onClose, onSave }) => {
  const [currentMode, setCurrentMode] = useState(mode);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      tc: employee?.tc || '',
      name: employee?.name || '',
      location: employee?.location || '',
      unit: employee?.unit || '',
      startDate: employee?.startDate || '',
      endDate: employee?.endDate || '',
      iban: employee?.iban || '',
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        tc: employee.tc || '',
        name: employee.name || '',
        location: employee.location || '',
        unit: employee.unit || '',
        startDate: employee.startDate || '',
        endDate: employee.endDate || '',
        iban: employee.iban || '',
      });
    }
  }, [employee, reset]);

  const onSubmit = (data) => {
    onSave(data, currentMode);
  };

  const handleFileUpload = (e) => {
     // TODO: Excel import logic
     console.log('File selected:', e.target.files[0]);
  };

  return (
    <div className="employee-modal">
      {!employee && (
        <div className="employee-modal__tabs">
          <button 
            type="button"
            className={`tab-btn ${currentMode === 'SINGLE' ? 'active' : ''}`}
            onClick={() => setCurrentMode('SINGLE')}
          >
            Tekli Giriş
          </button>
          <button 
            type="button"
            className={`tab-btn ${currentMode === 'BULK' ? 'active' : ''}`}
            onClick={() => setCurrentMode('BULK')}
          >
            Toplu Giriş
          </button>
        </div>
      )}

      {currentMode === 'SINGLE' ? (
        <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="settings-row">
            <div className="floating-group">
              <input
                type="text"
                id="tc"
                className={`input ${errors.tc ? 'input--error' : ''}`}
                placeholder=" "
                maxLength={11}
                {...register('tc')}
              />
              <label htmlFor="tc" className="floating-group__label">TC No</label>
              {errors.tc && <span className="input-error-message">{errors.tc.message}</span>}
            </div>

            <div className="floating-group">
              <input
                type="text"
                id="name"
                className={`input ${errors.name ? 'input--error' : ''}`}
                placeholder=" "
                {...register('name')}
              />
              <label htmlFor="name" className="floating-group__label">Ad Soyad</label>
              {errors.name && <span className="input-error-message">{errors.name.message}</span>}
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
              <label htmlFor="location" className="floating-group__label">Yerleşke</label>
              {errors.location && <span className="input-error-message">{errors.location.message}</span>}
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
              <label htmlFor="unit" className="floating-group__label">Birim</label>
              {errors.unit && <span className="input-error-message">{errors.unit.message}</span>}
            </div>
          </div>

          <div className="settings-row">
            <div className="floating-group">
              <input
                type="date"
                id="startDate"
                className={`input ${errors.startDate ? 'input--error' : ''}`}
                placeholder=" "
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
                placeholder=" "
                {...register('endDate')}
              />
              <label htmlFor="endDate" className="floating-group__label">İşten Çıkış</label>
              {errors.endDate && <span className="input-error-message">{errors.endDate.message}</span>}
            </div>
          </div>

          <div className="floating-group flex-full">
            <input
              type="text"
              id="iban"
              className={`input ${errors.iban ? 'input--error' : ''}`}
              placeholder=" TR..."
              {...register('iban')}
            />
            <label htmlFor="iban" className="floating-group__label">IBAN</label>
            {errors.iban && <span className="input-error-message">{errors.iban.message}</span>}
          </div>

          <div className="modal-form__actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <button type="button" className="btn" onClick={() => onClose(null)}>Vazgeç</button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={employee ? !isDirty : false}
            >
              {employee ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bulk-upload-section">
           <div className="upload-box">
              <FiUploadCloud className="upload-icon" />
              <h3>Excel Dosyası Yükle</h3>
              <p>Çalışan listesini şablona uygun bir Excel (.xlsx, .xls) dosyası olarak yükleyin.</p>
              
              <input 
                type="file" 
                id="excel-upload" 
                accept=".xlsx, .xls"
                className="file-input-hidden"
                onChange={handleFileUpload}
              />
              <label htmlFor="excel-upload" className="btn btn--primary upload-btn">
                Dosya Seç
              </label>
           </div>
           
           <div className="template-download">
             <a href="#" className="link-text">Örnek Excel Şablonunu İndir</a>
           </div>

           <div className="modal-form__actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <button type="button" className="btn" onClick={() => onClose(null)}>Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeModal;
