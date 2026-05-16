import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IbanCell from './IbanCell';

describe('IbanCell Bileşeni', () => {
  const mockIban = 'TR123456789012345678901234';

  beforeEach(() => {
    // navigator.clipboard mock'laması (jsdom'da varsayılan olarak yoktur)
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    
    // getBoundingClientRect mock'laması (Tooltip konumu için)
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 30,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  it('IBAN numarasını maskeleyerek render etmeli (ilk 6 karakter + ...)', () => {
    render(<IbanCell iban={mockIban} />);
    
    // TR1234... şeklinde görünmeli
    expect(screen.getByText('TR1234...')).toBeInTheDocument();
  });

  it('fare butona geldiğinde tam IBAN tooltip içinde görünmeli', async () => {
    render(<IbanCell iban={mockIban} />);
    
    const copyBtn = screen.getByRole('button');
    
    fireEvent.mouseEnter(copyBtn);

    // Tooltip içindeki tam IBAN'ı kontrol et
    expect(screen.getByText(mockIban)).toBeInTheDocument();
  });

  it('butona tıklandığında panoya kopyalamalı ve mesajı değiştirmeli', async () => {
    vi.useFakeTimers(); // setTimeout'ları kontrol etmek için
    
    render(<IbanCell iban={mockIban} />);
    
    const copyBtn = screen.getByRole('button');
    
    // Önce tooltip'i aç (mesajın değiştiğini görmek için)
    fireEvent.mouseEnter(copyBtn);
    
    // Tıkla
    fireEvent.click(copyBtn);

    // Kopyalama fonksiyonu çağrıldı mı?
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockIban);

    // Tooltip metni "Kopyalandı!" oldu mu?
    expect(screen.getByText('Kopyalandı!')).toBeInTheDocument();

    // 2 saniye sonra eski haline dönmeli
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText(mockIban)).toBeInTheDocument();
    
    vi.useRealTimers();
  });
});
