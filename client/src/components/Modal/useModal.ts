import { useContext } from 'react';
import { ModalContext } from './ModalContext';
import type { ModalContextValue, ConfirmOptions } from './ModalContext';

export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const { showConfirm } = useModal();
  return showConfirm;
}
