import React, { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ToastBar/ToastContext';
import { ModalProvider } from '@/components/Modal';
import { AuthProvider } from '@/context/AuthContext';

interface WrapperProps {
  children: ReactNode;
}

export function AllProviders({ children }: WrapperProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
