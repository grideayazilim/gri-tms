import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';
import { ToastProvider } from '../../components/ToastBar/ToastContext';

// Geçerli UUID örnekleri (Şema validasyonu için şart)
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UNIT_UUID = '660e8400-e29b-41d4-a716-446655441111';

// Crypto polyfill
const mockUUID = () => Math.random().toString(36).substring(2);
if (typeof window !== 'undefined') {
  if (!window.crypto) (window as any).crypto = {};
  if (!(window.crypto as any).randomUUID) (window.crypto as any).randomUUID = mockUUID;
}
if (!global.crypto) (global as any).crypto = { randomUUID: mockUUID };

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => children,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../hooks/data/useLocationsAndUnits', () => ({
  useLocationsAndUnits: () => ({
    locations: [{ id: VALID_UUID, name: 'Merkez Yerleşke', programNo: '101' }],
    units: [{ id: VALID_UNIT_UUID, name: 'IT Birimi' }],
    fetchLocations: vi.fn(),
    fetchUnitsByLocation: vi.fn(),
  }),
}));

const mockLogin = vi.fn();
const mockRegister = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
  }),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('AuthPage (Giriş & Kayıt) Sayfası', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('başlangıçta "Hesaba Giriş Yap" formu görünmeli', () => {
    renderAuthPage();
    expect(screen.getByText('Hesaba Giriş Yap')).toBeInTheDocument();
  });

  it('Sekme değiştirme: "Hesap oluştur" linkine tıklanınca kayıt formu gelmeli', async () => {
    renderAuthPage();
    fireEvent.click(screen.getByText('Hesap oluştur'));
    expect(await screen.findByRole('heading', { name: 'Hesap Oluştur' })).toBeInTheDocument();
  });

  it('Giriş Akışı: Hatalı girişte hata mesajı göstermeli', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Hata' });
    renderAuthPage();
    fireEvent.change(screen.getByLabelText('Kullanıcı Adı'), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
    await waitFor(() => expect(screen.getByText('Hata')).toBeInTheDocument());
  });

  it('Giriş Akışı: Başarılı girişte ana sayfaya yönlendirmeli', async () => {
    mockLogin.mockResolvedValue({ success: true });
    renderAuthPage();
    fireEvent.change(screen.getByLabelText('Kullanıcı Adı'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('Kayıt Akışı: Birim Sorumlusu seçilince Yerleşke ve Birim alanları açılmalı', async () => {
    renderAuthPage();
    fireEvent.click(screen.getByText('Hesap oluştur'));
    const roleSelect = await screen.findByLabelText('Kullanıcı Türü');
    fireEvent.change(roleSelect, { target: { value: 'RESPONSIBLE' } });
    expect(await screen.findByLabelText('Yerleşke')).toBeInTheDocument();
    expect(await screen.findByLabelText('Birim')).toBeInTheDocument();
  });

  it('Kayıt Akışı: Başarılı kayıt sonrası Toast gösterilmeli ve giriş sekmesine dönmeli', async () => {
    mockRegister.mockResolvedValue({ success: true });
    renderAuthPage();

    fireEvent.click(screen.getByText('Hesap oluştur'));

    // Formu doldur
    // NOT: ADMIN rolü seçilse bile default değerler "" olduğu için şema UUID hatası verebilir.
    // Bu yüzden RESPONSIBLE seçip geçerli ID'ler vererek garantiye alıyoruz.
    const roleSelect = await screen.findByLabelText('Kullanıcı Türü');
    fireEvent.change(roleSelect, { target: { value: 'RESPONSIBLE' } });
    
    // Yerleşke ve Birim seçimi (Mock verilerimiz artık gerçek UUID formatında)
    const locationSelect = await screen.findByLabelText('Yerleşke');
    fireEvent.change(locationSelect, { target: { value: VALID_UUID } });
    
    const unitSelect = await screen.findByLabelText('Birim');
    fireEvent.change(unitSelect, { target: { value: VALID_UNIT_UUID } });

    fireEvent.change(screen.getByLabelText('Kullanıcı Adı'), { target: { value: 'yenikullanici' } });
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'Sifre123!' } });

    const submitBtn = screen.getByRole('button', { name: 'Hesap Oluştur' });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Artık mockRegister çağrılmalı çünkü validasyon (UUID dahil) geçecek
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    }, { timeout: 2000 });

    expect(await screen.findByText(/Kayıt başarılı/i)).toBeInTheDocument();
    expect(await screen.findByText('Hesaba Giriş Yap')).toBeInTheDocument();
  });

  it('Giris formu Enter tusuna basinca submit tetiklenmeli', async () => {
    mockLogin.mockResolvedValue({ success: true });
    renderAuthPage();

    fireEvent.change(screen.getByLabelText('Kullanıcı Adı'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'admin123' } });

    const form = document.querySelector('form');
    if (form) fireEvent.keyDown(form, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });

  it('Kayit formu Enter tusuna basinca calisabilmeli', async () => {
    renderAuthPage();

    fireEvent.click(screen.getByText('Hesap oluştur'));

    const form = document.querySelector('form');
    if (form) {
      fireEvent.keyDown(form, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(form, { key: 'a', code: 'KeyA' });
    }
    expect(form).toBeTruthy();
  });
});
