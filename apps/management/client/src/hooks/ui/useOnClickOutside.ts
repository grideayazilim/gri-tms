/* ========================================================================
   USE ON CLICK OUTSIDE
   Verilen ref'in dışına tıklandığında handler'ı çalıştırır.
   ======================================================================== */
import { useEffect, type RefObject } from 'react';

export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler, active]);
}
