import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { announcementSchema } from '../../schemas/announcement.schema';
import '../../styles/inputs.scss';
import './Announcements.scss';

function AnnouncementForm({ onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const contentValue = watch("content", "");

  return (
    <form className="announcement-form" onSubmit={handleSubmit(onSubmit)}>
      {/* Başlık */}
      <div className="floating-group">
        <input
          type="text"
          className={`input ${errors.title ? 'input--error' : ''}`}
          placeholder=" "
          maxLength={100}
          {...register('title')}
          disabled={isSubmitting}
        />
        <label className="floating-group__label">Başlık</label>
        {errors.title && (
          <span className="input-error-message">{errors.title.message}</span>
        )}
      </div>

      {/* İçerik */}
      <div className="floating-group">
        <textarea
          className={`input announcement-form__textarea ${errors.content ? 'input--error' : ''}`}
          placeholder=" "
          maxLength={1000}
          rows={6}
          {...register('content')}
          disabled={isSubmitting}
        />
        <label className="floating-group__label">İçerik</label>
        {errors.content && (
          <span className="input-error-message">{errors.content.message}</span>
        )}
        <span className="input-hint">
          {contentValue.length} / 1000 karakter
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
