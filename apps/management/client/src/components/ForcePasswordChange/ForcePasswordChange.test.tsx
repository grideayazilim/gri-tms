import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ForcePasswordChange from './ForcePasswordChange';

/* Varsayılan şifreyle giriş yapan kullanıcıya kapatılamaz bir modal
   gösterilir. Kapı sunucu tarafında da var; bu testler arayüz sözleşmesini
   kilitler. */

const mockChangeInitialPassword = vi.fn();
const mockLogout = vi.fn();
let mockMustChange = true;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    mustChangePassword: mockMustChange,
    changeInitialPassword: mockChangeInitialPassword,
    logout: mockLogout,
    user: { id: 'u1', username: 'admin', role: 'ADMIN', locationId: null, unitId: null },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockMustChange = true;
  mockChangeInitialPassword.mockResolvedValue({ success: true, data: {} });
});

function typePasswords(pwd: string, confirm: string) {
  fireEvent.change(screen.getByLabelText('Yeni şifre'), { target: { value: pwd } });
  fireEvent.change(screen.getByLabelText('Yeni şifre (tekrar)'), { target: { value: confirm } });
}

describe('ForcePasswordChange', () => {
  it('bayrak kapalıyken hiçbir şey render etmez', () => {
    mockMustChange = false;
    const { container } = render(<ForcePasswordChange />);
    expect(container).toBeEmptyDOMElement();
  });

  it('bayrak açıkken modal görünür ve iki şifre alanı vardır', () => {
    render(<ForcePasswordChange />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Yeni şifre')).toBeInTheDocument();
    expect(screen.getByLabelText('Yeni şifre (tekrar)')).toBeInTheDocument();
  });

  it('kapatma düğmesi yoktur (modal kapatılamaz)', () => {
    render(<ForcePasswordChange />);

    expect(screen.queryByRole('button', { name: /kapat/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /×/ })).not.toBeInTheDocument();
  });

  it('boş formda gönder düğmesi pasiftir', () => {
    render(<ForcePasswordChange />);
    expect(screen.getByRole('button', { name: 'Şifreyi Değiştir' })).toBeDisabled();
  });

  it('10 karakterden kısa şifrede uyarı gösterir ve gönderim engellenir', () => {
    render(<ForcePasswordChange />);
    typePasswords('kisa123', 'kisa123');

    expect(screen.getByText('Şifre en az 10 karakter olmalıdır')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Şifreyi Değiştir' })).toBeDisabled();
  });

  it('şifreler eşleşmiyorsa uyarı gösterir ve gönderim engellenir', () => {
    render(<ForcePasswordChange />);
    typePasswords('Guclu-Sifre-2026', 'Baska-Sifre-2026');

    expect(screen.getByText('Şifreler eşleşmiyor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Şifreyi Değiştir' })).toBeDisabled();
  });

  it('geçerli şifre ile changeInitialPassword çağrılır', async () => {
    render(<ForcePasswordChange />);
    typePasswords('Guclu-Sifre-2026', 'Guclu-Sifre-2026');

    fireEvent.click(screen.getByRole('button', { name: 'Şifreyi Değiştir' }));

    await waitFor(() => {
      expect(mockChangeInitialPassword).toHaveBeenCalledWith('Guclu-Sifre-2026', 'Guclu-Sifre-2026');
    });
  });

  it('sunucu hatası kullanıcıya gösterilir', async () => {
    mockChangeInitialPassword.mockResolvedValue({ success: false, error: 'Yeni şifre mevcut şifreyle aynı olamaz.' });
    render(<ForcePasswordChange />);
    typePasswords('Guclu-Sifre-2026', 'Guclu-Sifre-2026');

    fireEvent.click(screen.getByRole('button', { name: 'Şifreyi Değiştir' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Yeni şifre mevcut şifreyle aynı olamaz.');
  });

  it('çıkış yap düğmesi logout çağırır', () => {
    render(<ForcePasswordChange />);
    fireEvent.click(screen.getByRole('button', { name: 'Çıkış yap' }));
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});
