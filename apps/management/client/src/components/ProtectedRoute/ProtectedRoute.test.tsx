import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

/*
  ProtectedRoute Testleri
  - Boot süresinde yükleniyor göstermeli
  - Authenticate olmamış kullanıcı /auth'a yönlendirilmeli
  - Authenticated kullanıcı children render edilmeli
  - adminOnly route + non-admin → anasayfaya yönlendirilmeli
  - adminOnly route + admin → children render edilmeli
*/

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

const mockUseAuth = vi.mocked(useAuth);

function renderProtectedRoute(
  adminOnly = false,
  children = <div data-testid="protected-content">Korumalı İçerik</div>,
) {
  return render(
    <MemoryRouter>
      <ProtectedRoute adminOnly={adminOnly}>{children}</ProtectedRoute>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute bileşeni', () => {
  it('boot süresinde "Yükleniyor..." göstermeli', () => {
    mockUseAuth.mockReturnValue({
      isBooting: true,
      isAuthenticated: false,
      user: null,
    } as any);

    renderProtectedRoute();
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('authenticated olmamış kullanıcı children render edilmemeli', () => {
    mockUseAuth.mockReturnValue({
      isBooting: false,
      isAuthenticated: false,
      user: null,
    } as any);

    renderProtectedRoute();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('authenticated kullanıcı children render edilmeli', () => {
    mockUseAuth.mockReturnValue({
      isBooting: false,
      isAuthenticated: true,
      user: { role: 'ADMIN' },
    } as any);

    renderProtectedRoute();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('adminOnly route + RESPONSIBLE kullanıcı children render edilmemeli', () => {
    mockUseAuth.mockReturnValue({
      isBooting: false,
      isAuthenticated: true,
      user: { role: 'RESPONSIBLE' },
    } as any);

    renderProtectedRoute(true);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('adminOnly route + ADMIN kullanıcı children render edilmeli', () => {
    mockUseAuth.mockReturnValue({
      isBooting: false,
      isAuthenticated: true,
      user: { role: 'ADMIN' },
    } as any);

    renderProtectedRoute(true);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('adminOnly false + RESPONSIBLE kullanıcı children render edilmeli', () => {
    mockUseAuth.mockReturnValue({
      isBooting: false,
      isAuthenticated: true,
      user: { role: 'RESPONSIBLE' },
    } as any);

    renderProtectedRoute(false);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('adminOnly varsayılan false olmalı', () => {
    mockUseAuth.mockReturnValue({
      isBooting: false,
      isAuthenticated: true,
      user: { role: 'RESPONSIBLE' },
    } as any);

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="default-child">İçerik</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('default-child')).toBeInTheDocument();
  });
});
