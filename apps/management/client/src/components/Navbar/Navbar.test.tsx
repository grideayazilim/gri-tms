// React bileşenlerini test etmek için gerekli kütüphaneler
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

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
  useAuth: () => ({
    user: { id: 'u-1', username: 'admin', role: 'ADMIN' },
    isAdmin: true,
    isAuthenticated: true,
    logout: vi.fn().mockResolvedValue(undefined),
    isBooting: false,
  }),
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
  it('temel navigasyon bağlantıları render edilmeli', () => {
    renderNavbar();

    // Puantaj sayfası tüm kullanıcılara gösterilir
    expect(screen.getByText('Puantaj İşaretleme')).toBeInTheDocument();
    // Ayarlar linki her zaman gösterilir
    expect(screen.getByText('Ayarlar')).toBeInTheDocument();
  });

  it('admin kullanıcı için admin-only sayfaları görünmeli', () => {
    // isAdmin: true (mock'ta tanımladık)
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

  it('"Çıkış Yap" butonuna tıklandığında bileşen çökmemeli', () => {
    // useAuth dosyanın başında mock'landı (logout: vi.fn().mockResolvedValue(undefined))
    // Sadece tıklamanın hata fırlatmadığını doğruluyoruz
    renderNavbar();

    const logoutBtn = screen.getByText('Çıkış Yap');
    expect(logoutBtn).toBeInTheDocument();

    // Hata fırlatmadan tıklanabilmeli
    expect(() => fireEvent.click(logoutBtn)).not.toThrow();
  });

  it('uygulama logosu / başlığı görünmeli', () => {
    renderNavbar();

    // Navbar'daki "griTMS" logo kısmı
    expect(screen.getByText('gri')).toBeInTheDocument();
    expect(screen.getByText('TMS')).toBeInTheDocument();
  });
});
