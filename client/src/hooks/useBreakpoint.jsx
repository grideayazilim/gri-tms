// KULLANIM
// Component içerisinde: const { isPhone, isTablet, isDesktop } = useBreakpoint();

import { useEffect, useState } from "react";

export function useBreakpoint() {
  const getBreakpoint = () => {
    const width = window.innerWidth;
    if (width <= 500) return "phone";
    if (width <= 1024) return "tablet";
    return "desktop";
  };

  const [breakpoint, setBreakpoint] = useState(() => getBreakpoint());

  useEffect(() => {
    const handleResize = () => {
      const newBreakpoint = getBreakpoint();
      setBreakpoint(prev =>
        prev !== newBreakpoint ? newBreakpoint : prev
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isPhone: breakpoint === "phone",
    isTablet: breakpoint === "tablet",
    isDesktop: breakpoint === "desktop",
  };
}
