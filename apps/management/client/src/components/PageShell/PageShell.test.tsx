import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PageShell from './PageShell';

/* 
  framer-motion test ortamında (JSDOM) sorun çıkarabildiği için mock'lıyoruz.
  Sadece içeriği direkt render etmesi yeterli.
*/
vi.mock('framer-motion', () => ({
  motion: {
    main: ({ children, className }: any) => <main className={className}>{children}</main>,
  },
}));

/* useAuth hook'unu mock'lıyoruz */
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN' },
  }),
}));

/* InfoButton'ı mock'lıyoruz (PageShell içinde kullanılıyor) */
vi.mock('../VideoInfoModal/VideoInfoModal', () => ({
  InfoButton: () => <div data-testid="info-button">Bilgi Butonu</div>,
}));

describe('PageShell Bileşeni', () => {
  it('başlık ve çocuk bileşenleri (children) doğru şekilde render etmeli', () => {
    render(
      <PageShell title="Ana Sayfa">
        <div data-testid="test-content">İçerik Alanı</div>
      </PageShell>
    );

    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('headerActions propu verildiğinde aksiyon butonlarını göstermeli', () => {
    render(
      <PageShell 
        title="Liste" 
        headerActions={<button>Yeni Ekle</button>}
      >
        <div>Tablo</div>
      </PageShell>
    );

    expect(screen.getByRole('button', { name: 'Yeni Ekle' })).toBeInTheDocument();
  });

  it('ne başlık ne de aksiyon verilirse header alanı render edilmemeli', () => {
    const { container } = render(
      <PageShell>
        <div>Sadece İçerik</div>
      </PageShell>
    );

    // .page-header sınıfına sahip bir div olmamalı
    const header = container.querySelector('.page-header');
    expect(header).not.toBeInTheDocument();
  });

  it('infoVideos konfigürasyonu varsa InfoButton görünmeli', () => {
    const mockVideos = {
      videos: [{ title: 'Test Video', url: '...' }]
    };

    render(
      <PageShell title="Video Sayfası" infoVideos={mockVideos as any}>
        <div>İçerik</div>
      </PageShell>
    );

    expect(screen.getByTestId('info-button')).toBeInTheDocument();
  });
});
