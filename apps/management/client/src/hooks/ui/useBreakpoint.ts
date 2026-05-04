/* ========================================================================
   USE BREAKPOINT
   Ekran genişliğine göre responsive breakpoint bilgisi döndürür.
   ======================================================================== */
import { useState, useEffect } from 'react';

type Breakpoint = 'phone' | 'tablet' | 'desktop';

const PHONE_MAX = 768;
const TABLET_MAX = 1024;

function getBreakpoint(width: number): Breakpoint {
  if (width < PHONE_MAX) return 'phone';
  if (width < TABLET_MAX) return 'tablet';
  return 'desktop';
}

export function useBreakpoint(): {
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === 'undefined' ? 'desktop' : getBreakpoint(window.innerWidth),
  );

  useEffect(() => {
    const handler = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return {
    isPhone: bp === 'phone',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
  };
}
