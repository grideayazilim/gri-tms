/* ========================================================================
   ZORUNLU ŞİFRE DEĞİŞİMİ MODALI

   Seed admin'i `must_change_password = true` ile oluşturulur. Bu bayrak
   açıkken kullanıcı giriş yapabilir ama şifresini değiştirene kadar başka
   hiçbir API'yi kullanamaz (kapı sunucu tarafında, authMiddleware içinde).

   Bu modal kapatılamaz: kapatma düğmesi, ESC ve backdrop tıklaması yoktur.
   Kullanıcının tek çıkış yolu şifreyi değiştirmek ya da çıkış yapmaktır.
   ======================================================================== */
import { useState, type FormEvent } from 'react';

/* Uzunluk sınırı ve kural metni yerel sabit yerine ortak politikadan
   okunur; politika değişirse arayüz de değişir. */
import { MIN_PASSWORD_LENGTH, PASSWORD_RULE_TEXT } from '@timesheet/shared';
import { useAuth } from '../../context/AuthContext';
import './ForcePasswordChange.scss';


function ForcePasswordChange() {
  const { mustChangePassword, changeInitialPassword, logout, user } = useAuth();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!mustChangePassword) return null;

  const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && password === passwordConfirm && !isSubmitting;

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setIsSubmitting(true);
    const result = await changeInitialPassword(password, passwordConfirm);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setPassword('');
    setPasswordConfirm('');
  };

  return (
    <div className="force-password" role="dialog" aria-modal="true" aria-labelledby="force-password-title">
      <div className="force-password__panel">
        <h2 className="force-password__title" id="force-password-title">
          Şifrenizi belirleyin
        </h2>

        <p className="force-password__description">
          <strong>{user?.username}</strong> hesabı hâlâ varsayılan şifreyi kullanıyor.
          Güvenliğiniz için devam etmeden önce yeni bir şifre belirlemeniz gerekiyor.
        </p>

        <form className="force-password__form" onSubmit={handleSubmit} noValidate>
          <div className="force-password__field">
            <label className="force-password__label" htmlFor="force-password-new">
              Yeni şifre
            </label>
            <input
              id="force-password-new"
              className="input"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* Kural metni ortak sabitten okunur */}
            <span className="input-rule-hint">{PASSWORD_RULE_TEXT}</span>
            {tooShort && (
              <span className="input-error-message">
                Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalıdır
              </span>
            )}
          </div>

          <div className="force-password__field">
            <label className="force-password__label" htmlFor="force-password-confirm">
              Yeni şifre (tekrar)
            </label>
            <input
              id="force-password-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
            {mismatch && <span className="input-error-message">Şifreler eşleşmiyor</span>}
          </div>

          {error && <div className="force-password__error" role="alert">{error}</div>}

          <button className="btn btn--primary force-password__submit" type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
          </button>

          <button
            className="force-password__logout"
            type="button"
            onClick={() => { void logout(); }}
          >
            Çıkış yap
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForcePasswordChange;
