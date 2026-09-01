/* ========================================================================
   RESET DIALOGS (SİSTEM SIFIRLAMA DİYALOGLARI)
   Sıfırlamanın onay ve sonuç modallerinin içerikleri.

   Onay, kelime yazmayı gerektirir: genel "emin misiniz?" modalları kas
   hafızasıyla tıklanır ve bu sistemdeki en yıkıcı, geri dönüşü olmayan işlemdir.
   Sonuç da kalıcı bir modalda gösterilir; kaybolan bir toast, yöneticiye
   verilerin silinip silinmediğini söylemez.
   ======================================================================== */
import { useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiCopy, FiXCircle } from 'react-icons/fi';
import './ResetDialogs.scss';

/** Onay için birebir yazılması gereken kelime. */
export const RESET_CONFIRM_WORD = 'SIFIRLA';

// ─── Onay içeriği ────────────────────────────────────────────────────────────

interface ResetConfirmContentProps {
  deleteLocationsAndUnits: boolean;
  onClose: (result: boolean) => void;
}

export function ResetConfirmContent({ deleteLocationsAndUnits, onClose }: ResetConfirmContentProps) {
  const [typed, setTyped] = useState('');
  const canConfirm = typed === RESET_CONFIRM_WORD;

  return (
    <div className="reset-confirm">
      <p className="reset-confirm__warning">
        <FiAlertTriangle aria-hidden="true" />
        Bu işlem geri alınamaz.
      </p>

      <p className="reset-confirm__intro">Silinecekler:</p>
      <ul className="reset-confirm__list">
        <li>Tüm puantajlar</li>
        <li>Tüm çalışanlar</li>
        <li>Tüm dönemler</li>
        <li>Yönetici olmayan tüm kullanıcılar</li>
        {deleteLocationsAndUnits && <li>Tüm yerleşkeler ve birimler</li>}
      </ul>

      <label className="reset-confirm__field" htmlFor="reset-confirm-word">
        Onaylamak için <strong>{RESET_CONFIRM_WORD}</strong> yazın:
      </label>
      <input
        id="reset-confirm-word"
        className="input"
        type="text"
        autoComplete="off"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
      />

      <div className="confirm-dialog-actions">
        <button className="btn btn--secondary" onClick={() => onClose(false)}>
          Vazgeç
        </button>
        <button className="btn btn--danger" disabled={!canConfirm} onClick={() => onClose(true)}>
          Sistemi Sıfırla
        </button>
      </div>
    </div>
  );
}

// ─── Sonuç içeriği ───────────────────────────────────────────────────────────

export interface ResetSuccessDetails {
  employees: number;
  users: number;
  periods: number;
}

interface ResetSuccessContentProps {
  deleted: ResetSuccessDetails;
  onClose: (result: boolean) => void;
}

export function ResetSuccessContent({ deleted, onClose }: ResetSuccessContentProps) {
  return (
    <div className="reset-result reset-result--success">
      <p className="reset-result__headline">
        <FiCheckCircle aria-hidden="true" />
        Sistem başarıyla sıfırlandı.
      </p>

      <ul className="reset-result__list">
        <li>{deleted.employees} çalışan silindi</li>
        <li>{deleted.users} kullanıcı silindi</li>
        <li>{deleted.periods} dönem silindi</li>
      </ul>

      <p className="reset-result__note">
        Tutarlı bir başlangıç için oturumunuz kapatılacak.
      </p>

      <div className="confirm-dialog-actions">
        <button className="btn" onClick={() => onClose(true)}>
          Tamam
        </button>
      </div>
    </div>
  );
}

interface ResetFailureContentProps {
  serverMessage: string;
  status: number | null;
  backupTaken: boolean;
  onClose: (result: boolean) => void;
}

export function ResetFailureContent({ serverMessage, status, backupTaken, onClose }: ResetFailureContentProps) {
  const [copied, setCopied] = useState(false);

  const copyDetails = () => {
    const details = [
      `Mesaj: ${serverMessage}`,
      `HTTP durumu: ${status ?? 'bilinmiyor'}`,
      `Zaman: ${new Date().toISOString()}`,
    ].join('\n');

    // Güvensiz bağlamda (HTTP) veya izin verilmediğinde clipboard yoktur
    void navigator.clipboard?.writeText(details).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <div className="reset-result reset-result--failure">
      <p className="reset-result__headline">
        <FiXCircle aria-hidden="true" />
        {serverMessage}
      </p>

      <ul className="reset-result__list">
        {/* Silme tek transaction içinde çalışır; hata durumunda tamamı geri alınır */}
        <li><strong>Verileriniz yerinde.</strong></li>
        {backupTaken && <li>İndirdiğiniz yedek geçerlidir, yeniden almanıza gerek yok.</li>}
        <li>Sorun giderildikten sonra işlemi güvenle tekrar deneyebilirsiniz.</li>
      </ul>

      <div className="confirm-dialog-actions">
        <button className="btn btn--secondary" onClick={copyDetails}>
          <FiCopy aria-hidden="true" />
          {copied ? 'Kopyalandı' : 'Hata detayını kopyala'}
        </button>
        <button className="btn" onClick={() => onClose(true)}>
          Tamam
        </button>
      </div>
    </div>
  );
}
