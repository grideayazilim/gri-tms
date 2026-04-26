import { useEffect } from 'react';

/**
 * Verilen ref'in dışına tıklandığında handler'ı çalıştırır.
 * @param {React.RefObject} ref - İzlenecek DOM referansı
 * @param {Function} handler - Dışarı tıklandığında çalışacak fonksiyon
 * @param {boolean} active - false ise listener eklenmez (koşullu açık/kapalı paneller için)
 */
export function useOnClickOutside(ref, handler, active) {
  useEffect(() => {
    if (!active) return;
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target) && typeof handler === 'function') handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler, active]);
}
