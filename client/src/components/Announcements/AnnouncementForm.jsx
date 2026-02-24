import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/inputs.scss';
import './Announcements.scss';

function AnnouncementForm({ onSubmit, onCancel }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [errors, setErrors] = useState({
    title: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {
      title: '',
      content: '',
    };
    let isValid = true;

    // Başlık validasyonu
    if (!formData.title.trim()) {
      newErrors.title = 'Başlık gereklidir';
      isValid = false;
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Başlık en az 3 karakter olmalıdır';
      isValid = false;
    } else if (formData.title.length > 100) {
      newErrors.title = 'Başlık en fazla 100 karakter olabilir';
      isValid = false;
    }

    // İçerik validasyonu
    if (!formData.content.trim()) {
      newErrors.content = 'İçerik gereklidir';
      isValid = false;
    } else if (formData.content.trim().length < 10) {
      newErrors.content = 'İçerik en az 10 karakter olmalıdır';
      isValid = false;
    } else if (formData.content.length > 1000) {
      newErrors.content = 'İçerik en fazla 1000 karakter olabilir';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    // Create announcement object
    const newAnnouncement = {
      id: Date.now().toString(),
      title: formData.title.trim(),
      content: formData.content.trim(),
      createdAt: new Date().toISOString(),
      createdBy: user?.username || 'Bilinmeyen',
    };

    // Simulate API call
    setTimeout(() => {
      onSubmit(newAnnouncement);
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <form className="announcement-form" onSubmit={handleSubmit}>
      {/* Başlık */}
      <div className="floating-group">
        <input
          type="text"
          className={`input ${errors.title ? 'input--error' : ''}`}
          placeholder=" "
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          maxLength={100}
        />
        <label className="floating-group__label">Başlık</label>
        {errors.title && (
          <span className="input-error">{errors.title}</span>
        )}
      </div>

      {/* İçerik */}
      <div className="floating-group">
        <textarea
          className={`input announcement-form__textarea ${errors.content ? 'input--error' : ''}`}
          placeholder=" "
          value={formData.content}
          onChange={(e) => handleChange('content', e.target.value)}
          maxLength={1000}
          rows={6}
        />
        <label className="floating-group__label">İçerik</label>
        {errors.content && (
          <span className="input-error">{errors.content}</span>
        )}
        <span className="input-hint">
          {formData.content.length} / 1000 karakter
        </span>
      </div>

      {/* Butonlar */}
      <div className="announcement-form__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          İptal
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
        </button>
      </div>
    </form>
  );
}

export default AnnouncementForm;

