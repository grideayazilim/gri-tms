import { useContext } from 'react';
import { ToastContext } from './ToastContext';
import type { ToastFn } from './ToastContext';

export function useToast(): ToastFn {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
