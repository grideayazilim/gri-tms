// Hook'ları test etmek için gerekli kütüphaneler
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useOnClickOutside } from './useOnClickOutside';

/*
  useOnClickOutside hook'u bir DOM elemanının (ref) DIŞINA tıklandığında
  verilen handler fonksiyonunu çağırır.
  3 parametre alır:
    - ref     → izlenecek DOM elemanı
    - handler → dışarıya tıklanınca çağrılacak fonksiyon
    - active  → hook aktif mi? false ise dinleme yapmaz
*/
describe('useOnClickOutside hook', () => {
  it('ref elementinin dışına tıklandığında handler çağrılmalı', () => {
    const handler = vi.fn(); // Sahte (mock) fonksiyon: kaç kez çağrıldığını izler

    // Sahte bir DOM elemanı oluştur
    const innerElement = document.createElement('div');
    const outerElement = document.createElement('div');
    document.body.appendChild(outerElement);
    document.body.appendChild(innerElement);

    const ref = { current: innerElement };

    renderHook(() => useOnClickOutside(ref, handler, true));

    // innerElement'in DIŞINDA (outerElement'e) mousedown olayı tetikle
    outerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);

    // Temizle
    document.body.removeChild(outerElement);
    document.body.removeChild(innerElement);
  });

  it('ref elementinin içine tıklandığında handler çağrılmamalı', () => {
    const handler = vi.fn();

    const innerElement = document.createElement('div');
    const childElement = document.createElement('span'); // İç eleman
    innerElement.appendChild(childElement);
    document.body.appendChild(innerElement);

    const ref = { current: innerElement };

    renderHook(() => useOnClickOutside(ref, handler, true));

    // İÇERİDE (childElement'e) tıkla — handler çağrılmamalı
    childElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(innerElement);
  });

  it('active false iken dışarıya tıklansa bile handler çağrılmamalı', () => {
    const handler = vi.fn();

    const innerElement = document.createElement('div');
    const outerElement = document.createElement('div');
    document.body.appendChild(outerElement);
    document.body.appendChild(innerElement);

    const ref = { current: innerElement };

    // active = false → hook dinlemiyor
    renderHook(() => useOnClickOutside(ref, handler, false));

    outerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(outerElement);
    document.body.removeChild(innerElement);
  });

  it('hook unmount edildiğinde event listener kaldırılmalı (bellek sızıntısı olmamalı)', () => {
    const handler = vi.fn();
    const outerElement = document.createElement('div');
    const innerElement = document.createElement('div');
    document.body.appendChild(outerElement);
    document.body.appendChild(innerElement);

    const ref = { current: innerElement };

    const { unmount } = renderHook(() => useOnClickOutside(ref, handler, true));

    // Hook'u unmount et (bileşen DOM'dan ayrıldı gibi)
    unmount();

    // Unmount sonrası dışarıya tıkla — temizleme (cleanup) çalıştıysa handler tetiklenmez
    outerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(outerElement);
    document.body.removeChild(innerElement);
  });

  it('active true dan false a geçince listener kaldırılmalı', () => {
    const handler = vi.fn();
    const innerElement = document.createElement('div');
    const outerElement = document.createElement('div');
    document.body.appendChild(outerElement);
    document.body.appendChild(innerElement);

    const ref = { current: innerElement };

    // Önce aktif başlat
    const { rerender } = renderHook(
      ({ active }) => useOnClickOutside(ref, handler, active),
      { initialProps: { active: true } }
    );

    // Dışarı tıkla — çağrılmalı
    outerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    // active'i false yap
    rerender({ active: false });
    handler.mockClear();

    // Tekrar dışarı tıkla — artık çağrılmamalı
    outerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(outerElement);
    document.body.removeChild(innerElement);
  });
});
