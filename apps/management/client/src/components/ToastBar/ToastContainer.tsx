import type { ComponentType } from 'react';

import {
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaExclamationCircle,
} from 'react-icons/fa';
import type { IconBaseProps } from 'react-icons';

import './Toast.scss';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  removing?: boolean;
}

interface ToastContainerProps {
  toasts: Toast[];
}

// ─── Bileşen ──────────────────────────────────────────────────────────────────

const toastIcons: Record<ToastType, ComponentType<IconBaseProps>> = {
  success: FaCheckCircle,
  error: FaTimesCircle,
  info: FaInfoCircle,
  warning: FaExclamationCircle,
};

function ToastContainer({ toasts }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];

        return (
          <div key={toast.id} className={`toast toast--${toast.type}${toast.removing ? " toast--removing" : ""}`}>
            <div className="toast__icon">{Icon && <Icon size={18} />}</div>
            <div className="toast__message">{toast.message}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
