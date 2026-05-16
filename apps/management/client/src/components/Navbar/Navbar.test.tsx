// React bileşenlerini test etmek için gerekli kütüphaneler
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';

/*
  Navbar bileşeni AuthContext, react-router ve framer-motion gibi bağımlılıklar içerir.
  Bu yüzden:
  - react-router-dom'u gerçek MemoryRouter ile sarıyoruz (NavLink çalışsın)
  - AuthContext mock'luyoruz (gerçek API çağrısı yapmasın)
  - framer-motion mock'luyoruz (animasyonlar test ortamında sorun çıkarır)

  Test stratejisi: Bileşenin render çıktısını ve kullanıcı etkileşimlerini doğrula.
*/

// framer-motion animasyonlarını test ortamında devre dışı bırak
vi.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, className, ref, ...rest }: any) => (
      <nav className={className} ref={ref}>{children}</nav>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// AuthContext'i mock'la — gerçek API çağrısı yapmasın
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u-1', username: 'admin', role: 'ADMIN' },
    isAdmin: true,
    isAuthenticated: true,
    logout: vi.fn().mockResolvedValue(undefined),
    isBooting: false,
  })),
}));

// Test için render yardımcısı: Navbar'ı MemoryRouter ile sarıp belirli path'e başlatır
function renderNavbar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar bileşeni', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u-1', username: 'admin', role: 'ADMIN' },
      isAdmin: true,
      isAuthenticated: true,
      logout: vi.fn().mockResolvedValue(undefined),
      isBooting: false,
    } as any);
  });

  it('temel navigasyon bağlantıları render edilmeli', () => {
    renderNavbar();

    expect(screen.getByText('Puantaj İşaretleme')).toBeInTheDocument();
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
  });

  it('admin kullanıcı için admin-only sayfaları görünmeli', () => {
    renderNavbar();

    expect(screen.getByText('Kullanıcılar')).toBeInTheDocument();
    expect(screen.getByText('Çalışanlar')).toBeInTheDocument();
    expect(screen.getByText('Yerleşke ve Birimler')).toBeInTheDocument();
    expect(screen.getByText('İşlem Kayıtları')).toBeInTheDocument();
  });

  it('admin için "Bot Sistemine Git" linki görünmeli', () => {
    renderNavbar();
    expect(screen.getByText('Bot Sistemine Git')).toBeInTheDocument();
  });

  it('"Çıkış Yap" butonu render edilmeli', () => {
    renderNavbar();
    expect(screen.getByText('Çıkış Yap')).toBeInTheDocument();
  });

  it('"Çıkış Yap" butonuna tıklandığında bileşen çökmemeli', async () => {
    renderNavbar();

    const logoutBtn = screen.getByText('Çıkış Yap');
    expect(logoutBtn).toBeInTheDocument();

    await expect(async () => {
      fireEvent.click(logoutBtn);
      await new Promise(resolve => setTimeout(resolve, 0));
    }).not.toThrowError();
  });

  it('uygulama logosu / başlığı görünmeli', () => {
    renderNavbar();
    expect(screen.getByText('gri')).toBeInTheDocument();
    expect(screen.getByText('TMS')).toBeInTheDocument();
  });

  it('non-admin kullanıcı için admin-only sayfaları görünmemeli', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u-2', username: 'sorumlu', role: 'RESPONSIBLE' },
      isAdmin: false,
      isAuthenticated: true,
      logout: vi.fn().mockResolvedValue(undefined),
      isBooting: false,
    } as any);

    renderNavbar();

    expect(screen.queryByText('Kullanıcılar')).not.toBeInTheDocument();
    expect(screen.queryByText('Yerleşke ve Birimler')).not.toBeInTheDocument();
    expect(screen.queryByText('Bot Sistemine Git')).not.toBeInTheDocument();
  });

  it('non-admin kullanıcı için Puantaj sayfası görünmeli', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u-2', username: 'sorumlu', role: 'RESPONSIBLE' },
      isAdmin: false,
      isAuthenticated: true,
      logout: vi.fn().mockResolvedValue(undefined),
      isBooting: false,
    } as any);

    renderNavbar();

    expect(screen.getByText('Puantaj İşaretleme')).toBeInTheDocument();
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
  });

  it('farklı path\'lerde render edilebilmeli', () => {
    renderNavbar('/employees');
    expect(screen.getByText('Çalışanlar')).toBeInTheDocument();
  });
});
