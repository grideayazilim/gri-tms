import { useState, useEffect } from "react";

const PHONE_MAX = 768;
const TABLET_MAX = 1024;

function getBreakpoint(width) {
  if (width < PHONE_MAX) return "phone";
  if (width < TABLET_MAX) return "tablet";
  return "desktop";
}

export function useBreakpoint() {
  const [bp, setBp] = useState(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    const handler = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    isPhone: bp === "phone",
    isTablet: bp === "tablet",
    isDesktop: bp === "desktop",
  };
}
