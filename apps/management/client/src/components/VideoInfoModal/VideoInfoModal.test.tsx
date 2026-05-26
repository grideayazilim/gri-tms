import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VideoInfoModal, { InfoButton } from './VideoInfoModal';

/*
  VideoInfoModal Testleri
  - Modal kapalıyken render edilmemeli
  - Modal açıkken başlık ve video render edilmeli
  - Kapatma butonu çalışmalı
  - ESC tuşuyla kapanmalı
  - Overlay tıklamasıyla kapanmalı
  - Navigasyon butonları (tek video / çoklu video)
  - InfoButton bileşeni
*/

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick }: any) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
    video: ({ children, ...props }: any) => (
      <video {...props}>
        {children}
      </video>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

const singleVideo = [{ src: 'video1.mp4', title: 'Birinci Video' }];
const multipleVideos = [
  { src: 'video1.mp4', title: 'Birinci Video' },
  { src: 'video2.mp4', title: 'İkinci Video' },
];

const mockConfig = { modalTitle: 'Test Videoları' };

describe('VideoInfoModal bileşeni', () => {
  it('isOpen false iken hiçbir şey render edilmemeli', () => {
    const { container } = render(
      <VideoInfoModal isOpen={false} onClose={vi.fn()} config={mockConfig} videos={singleVideo} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('isOpen true iken modal başlığı render edilmeli', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={singleVideo} />,
    );
    expect(screen.getByText('Test Videoları')).toBeInTheDocument();
  });

  it('config.modalTitle yoksa varsayılan "Nasıl Kullanılır?" göstermeli', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={{}} videos={singleVideo} />,
    );
    expect(screen.getByText('Nasıl Kullanılır?')).toBeInTheDocument();
  });

  it('video elementi render edilmeli', () => {
    const { container } = render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={singleVideo} />,
    );
    const videoEl = container.querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl!.src).toContain('video1.mp4');
  });

  it('kapatma butonu (✕) tıklanınca onClose çağrılmalı', () => {
    const onClose = vi.fn();
    render(
      <VideoInfoModal isOpen={true} onClose={onClose} config={mockConfig} videos={singleVideo} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC tuşuyla kapatma çalışmalı', () => {
    const onClose = vi.fn();
    render(
      <VideoInfoModal isOpen={true} onClose={onClose} config={mockConfig} videos={singleVideo} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('kapalı modalda ESC\'nin etkisi olmamalı', () => {
    const onClose = vi.fn();
    render(
      <VideoInfoModal isOpen={false} onClose={onClose} config={mockConfig} videos={singleVideo} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('tek video varken navigasyon butonları disabled olmalı', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={singleVideo} />,
    );
    const prevBtn = screen.getByRole('button', { name: /Geri/i });
    const nextBtn = screen.getByRole('button', { name: /İleri/i });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });

  it('birden fazla video varken İleri butonu aktif olmalı', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );
    const nextBtn = screen.getByRole('button', { name: /İleri/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it('birden fazla video varken ilk videoda Geri butonu disabled olmalı', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );
    const prevBtn = screen.getByRole('button', { name: /Geri/i });
    expect(prevBtn).toBeDisabled();
  });

  it('İleri butonuna basınca sayaç güncellenmeli', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /İleri/i }));

    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('son videodayken İleri butonu disabled olmalı', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /İleri/i }));

    const nextBtn = screen.getByRole('button', { name: /İleri/i });
    expect(nextBtn).toBeDisabled();
  });

  it('Geri butonuna basınca önceki videoya dönmeli', () => {
    render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /İleri/i }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Geri/i }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('modal yeniden açılınca indeks sıfırlanmalı', () => {
    const { rerender } = render(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /İleri/i }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    rerender(
      <VideoInfoModal isOpen={false} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );
    rerender(
      <VideoInfoModal isOpen={true} onClose={vi.fn()} config={mockConfig} videos={multipleVideos} />,
    );

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});

describe('InfoButton bileşeni', () => {
  it('info butonu render edilmeli', () => {
    render(<InfoButton config={mockConfig} videos={singleVideo} />);
    expect(screen.getByRole('button', { name: 'Bilgi videosu' })).toBeInTheDocument();
  });

  it('butona tıklanınca modal açılmalı', () => {
    render(<InfoButton config={mockConfig} videos={singleVideo} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bilgi videosu' }));
    expect(screen.getByText('Test Videoları')).toBeInTheDocument();
  });

  it('modal kapatınca modal kapanmalı', () => {
    render(<InfoButton config={mockConfig} videos={singleVideo} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bilgi videosu' }));
    expect(screen.getByText('Test Videoları')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(screen.queryByText('Test Videoları')).not.toBeInTheDocument();
  });
});
