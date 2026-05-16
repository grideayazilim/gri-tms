import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

/*
  NotFoundPage Entegrasyon Testleri
  - 404 Hata başlığının ve mesajının gösterilmesi
  - Ana sayfaya dönme linkinin (to="/") doğru çalışması ve özellikleri
  - UI yapısının (Tarayıcı illüstrasyonu, noktalar vb.) DOM'da olması
  - Arka plan görsel (SVG) elementlerinin yüklenmesi
*/

describe('NotFoundPage (404 Hata Sayfası)', () => {
  it('1. Case: 404 hata mesajını ve başlığını doğru render etmeli', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Görünüşe göre kaybolmuşsunuz....')).toBeInTheDocument();
  });

  it('2. Case: Ana sayfaya dönüş linki doğru path\'e (/) sahip olmalı ve erişilebilir olmalı', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    const homeLink = screen.getByRole('link', { name: /Ana Sayfaya Dön/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink).toHaveStyle({ textDecoration: 'none' });
  });

  it('3. Case: Tarayıcı illüstrasyonunu ve renkli noktaları (kırmızı, sarı, yeşil) içermeli', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    // CSS Sınıfları üzerinden elementlerin varlığını kontrol et
    expect(container.querySelector('.notfound__browser')).toBeInTheDocument();
    expect(container.querySelector('.notfound__dot--red')).toBeInTheDocument();
    expect(container.querySelector('.notfound__dot--yellow')).toBeInTheDocument();
    expect(container.querySelector('.notfound__dot--green')).toBeInTheDocument();
  });

  it('4. Case: Arka plan için kullanılan dekoratif SVG (dalga efekti) render edilmeli', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    // SVG elementi auth-page__wave sınıfıyla sayfada olmalı
    const svgElement = container.querySelector('svg.auth-page__wave');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute('viewBox', '0 0 1440 900');
  });
});
