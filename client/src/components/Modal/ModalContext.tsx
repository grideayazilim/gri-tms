/* ========================================================================
   MODAL CONTEXT - MODAL VE CONFIRM DIALOG YÖNETİMİ
   ========================================================================
   
   Bu dosya uygulamadaki tüm modal ve confirm dialog işlemlerini yönetir.
   Kullanım örnekleri için Modal.tsx dosyasına bakınız.
   ======================================================================== */

import type { ReactNode } from 'react';

import { createContext, useState, useCallback } from 'react';

import Modal from './Modal';

// ─── Tipler ───────────────────────────────────────────────────────────────────

type ModalSize = 'small' | 'medium' | 'large' | 'full';
type ConfirmType = 'danger' | 'warning' | 'info';

interface ModalOptions<T = unknown> {
  title: string;
  content: ReactNode | ((close: (result: T | null) => void) => ReactNode);
  size?: ModalSize;
  showCloseButton?: boolean;
}

interface ConfirmOptions {
  title?: string;
  message?: string;
  type?: ConfirmType;
  size?: ModalSize;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<void> | void;
}

interface ModalContextValue {
  showModal: <T = unknown>(options: ModalOptions<T>) => Promise<T | null>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  closeModal: (id: number, result: unknown) => void;
}

interface ModalEntry {
  id: number;
  type: string;
  title: string;
  content: ReactNode | ((close: (result: unknown) => void) => ReactNode);
  size?: ModalSize;
  showCloseButton?: boolean;
  resolve: (value: unknown) => void;
}

// ─── Confirm Content ──────────────────────────────────────────────────────────

interface ConfirmContentProps {
  message: string;
  type: ConfirmType;
  confirmText: string;
  cancelText: string;
  onConfirm?: () => Promise<void> | void;
  onClose: (result: boolean) => void;
}

function ConfirmContent({ message, type, confirmText, cancelText, onConfirm, onClose }: ConfirmContentProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (onConfirm) {
      setLoading(true);
      try {
        await onConfirm();
        onClose(true);
      } catch {
        onClose(false);
      }
    } else {
      onClose(true);
    }
  };

  return (
    <div>
      <p className="confirm-dialog-message">{message}</p>
      <div className="confirm-dialog-actions">
        <button className="btn btn--secondary" onClick={() => onClose(false)} disabled={loading}>
          {cancelText}
        </button>
        <button
          className={`btn ${type === "danger" ? "btn--danger" : ""}`}
          onClick={() => void handleConfirm()}
          disabled={loading}
        >
          {loading ? (
            <span className="confirm-dialog-loading">
              <span className="spinner confirm-dialog-spinner" />
              Yükleniyor...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const ModalContext = createContext<ModalContextValue | null>(null);

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [modals, setModals] = useState<ModalEntry[]>([]);

  const showModal = useCallback(<T = unknown,>(options: ModalOptions<T>): Promise<T | null> => {
    return new Promise<T | null>((resolve) => {
      const id = Date.now() + Math.random();
      // Modalları bir array'de tutarak üst üste açılabilmelerini (stackable) sağlıyoruz
      setModals(prev => [...prev, {
        id,
        type: 'modal',
        ...options,
        resolve: resolve as (value: unknown) => void,
      }]);
    });
  }, []);


  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return showModal<boolean>({
      title: options.title ?? 'Emin misiniz?',
      size: options.size ?? 'small',
      content: (closeModal) => (
        <ConfirmContent
          message={options.message ?? ''}
          type={options.type ?? 'danger'}
          confirmText={options.confirmText ?? 'Onayla'}
          cancelText={options.cancelText ?? 'Vazgeç'}
          {...(options.onConfirm != null ? { onConfirm: options.onConfirm } : {})}
          onClose={closeModal as (result: boolean) => void}
        />
      )
    }) as Promise<boolean>;
  }, [showModal]);

  const closeModal = useCallback((id: number, result: unknown) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === id);
      // Promise'i kullanıcıdan gelen sonuç (result) ile resolve et
      if (modal?.resolve) {
        modal.resolve(result);
      }
      // Modal'ı array'den çıkararak UI'dan sil
      return prev.filter(m => m.id !== id);
    });
  }, []);


  return (
    <ModalContext.Provider value={{ showModal, showConfirm, closeModal }}>
      {children}
      
      {/* Birden fazla modal açılırsa her birini z-index arttırarak render et */}
      {modals.map((modal, index) => (
        <Modal
          key={modal.id}
          title={modal.title}
          content={modal.content}
          size={modal.size ?? 'medium'}
          showCloseButton={modal.showCloseButton ?? true}
          zIndex={3000 + index} // Her yeni modal bir öncekinin üstünde görünür
          onClose={(result) => closeModal(modal.id, result)}
        />
      ))}
    </ModalContext.Provider>

  );
}

export { ModalContext };
export type { ModalContextValue, ConfirmOptions };
