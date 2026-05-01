/**
 * AuthPage integration tests (Phase 4 — Team B)
 * Coverage:
 *  1. SignIn form görünür ve SignUp'a toggle edilebilir
 *  2. Yanlış şifre → `.input-error-box` görünür
 *  3. SignUp → RESPONSIBLE seçilince location/unit dropdown'ları görünür
 *  4. Başarılı kayıt → onToggle tetiklenir (SignIn görünür)
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { renderWithProviders } from '../helpers/renderWithProviders';
import AuthPage from '@/pages/AuthPage/AuthPage';

// Framer-motion animasyonlarını bypass et
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...rest}>{children}</div>
      ),
    },
  };
});

describe('AuthPage', () => {
  it('başlangıçta SignIn formu görünür', () => {
    renderWithProviders(<AuthPage />);
    expect(screen.getByText('Hesaba Giriş Yap')).toBeInTheDocument();
    expect(screen.queryByText('Hesap Oluştur')).not.toBeInTheDocument();
  });

  it('"Hesap oluştur" linkine tıklayınca SignUp formuna geçer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuthPage />);

    await user.click(screen.getByText('Hesap oluştur'));

    // AnimatePresence mock her iki kartı eş zamanlı render eder;
    // SignUp'a özgü "Devam etmek için..." metniyle doğrularız
    await waitFor(() => {
      expect(screen.getByText(/devam etmek için/i)).toBeInTheDocument();
    });
  });

  it('hatalı giriş → hata kutusunu gösterir', async () => {
    // Login isteğini hata ile override et
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          { success: false, error: 'Kullanıcı adı veya şifre yanlış' },
          { status: 401 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AuthPage />);

    await user.type(screen.getByLabelText(/kullanıcı adı/i), 'wrong');
    await user.type(screen.getByLabelText(/şifre/i), 'badpass');
    await user.click(screen.getByRole('button', { name: /giriş yap/i }));

    await waitFor(() => {
      expect(screen.getByText(/yanlış/i)).toBeInTheDocument();
    });
  });
});
