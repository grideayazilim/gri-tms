/* ========================================================================
   TOAST CONTEXT - BİLDİRİM YÖNETİMİ
   ========================================================================
   
   Bu dosya uygulamadaki tüm toast bildirimlerini yönetir.
   Toast'lar ekranın sağ üst köşesinde otomatik olarak gösterilir ve
   belirtilen süre sonra kaybolur.
   ======================================================================== */

import type { ReactNode } from 'react';

import {
  createContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';

import ToastContainer from './ToastContainer';
import type { Toast, ToastType } from './ToastContainer';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface ToastInput {
  type?: ToastType;
  message?: string;
  duration?: number;
}

type ToastFn = (input: ToastInput) => void;

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastFn | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, removing: true } : t));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);

    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  const toast = useCallback(
    ({ type = 'info', message = '', duration = 3000 }: ToastInput) => {
      const id = crypto.randomUUID();

      setToasts((prev) => [...prev, { id, type, message }]);

      const timeout = setTimeout(() => {
        removeToast(id);
      }, duration);

      timeouts.current[id] = timeout;
    },
    [removeToast],
  );

  useEffect(() => {
    const pendingTimeouts = timeouts.current;
    return () => {
      Object.values(pendingTimeouts).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export { ToastContext };
export type { ToastFn };
