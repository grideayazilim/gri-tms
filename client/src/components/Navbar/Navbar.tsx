// =================== ICON IMPORTLARI
// Logout
import { LiaPowerOffSolid } from "react-icons/lia";
// Mobile pop
import { VscArrowUp } from "react-icons/vsc";

// =================== CORE IMPORTLAR
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useBreakpoint } from "../../hooks/ui/useBreakpoint";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { managementRoutes, settingsRoute } from "../../routes";
import "./Navbar.scss";

function Navbar() {
  // ========== HOOK TANIMLARI
  const { isPhone, isTablet, isDesktop } = useBreakpoint();
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ========== STATE'LER
  // Telefon ekranında management bar'ının görünüp görünmediği
  const [popManagementBar, setPopManagementBar] = useState(false);

  // ========== REFERANSLAR
  // Dikey ve yatay hareket indicator için
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // ========== YARDIMCI FONKSİYONLAR
  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  // Kullanıcının görebileceği management route'ları filtrele
  const visibleManagementRoutes = managementRoutes.filter(route => {
    if (route.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  // Bulunulan sayfanın route'unun array'deki objesini alır
  const activeManagementRoute =
    visibleManagementRoutes.find((r) => r.path === location.pathname) ?? null;

  // Yukarıdaki değişken undefined ise (route, management route değil) bu değeri false yap
  const isManagementRouteActive = !!activeManagementRoute;

  // ========== USEEFFECT KISMI
  // Indicator movement
  useEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;

    const active = nav.querySelector<HTMLElement>(".nav__link.active");
    const navRect = nav.getBoundingClientRect();

    // Dikey indicatör stili (desktop'ta)
    const setVerticalIndicator = (rect: DOMRect) => {
      Object.assign(indicator.style, {
        left: "0px",
        top: rect.top - navRect.top + "px",
        height: rect.height + "px",
        width: "5px",
      });
    };

    // Yatay indicatör stili (tablet ve telefonda)
    const setHorizontalIndicator = (rect: DOMRect) => {
      Object.assign(indicator.style, {
        top: "auto",
        bottom: "0px",
        left: rect.left - navRect.left + "px",
        width: rect.width + "px",
        height: "5px",
      });
    };

    // Telefon ekranı
    if (isPhone) {
      // Management route aktifse, çizgiyi navigator'ün altına getir
      if (isManagementRouteActive) {
        const managementNav = nav.querySelector<HTMLElement>(".nav__management-navigator");
        if (!managementNav) return;

        const rect = managementNav.getBoundingClientRect();
        setHorizontalIndicator(rect);
      } else {
        // Bir management route aktif değilse, çizgiyi direkt aktif olan elementin altına getir
        if (!active) return;

        const activeRect = active.getBoundingClientRect();
        setHorizontalIndicator(activeRect);
      }
      return;
    }

    // Tablet ekranı
    if (isTablet) {
      if (!active) return;

      // Çizgiyi direkt aktif olan elementin altına getir
      const activeRect = active.getBoundingClientRect();
      setHorizontalIndicator(activeRect);
      return;
    }

    // Desktop ekranı
    if (isDesktop) {
      if (!active) return;

      // Çizgiyi direkt aktif olan elementin soluna getir
      const activeRect = active.getBoundingClientRect();
      setVerticalIndicator(activeRect);
    }
  }, [
    location,
    visibleManagementRoutes,
    isPhone,
    isTablet,
    isDesktop,
    isManagementRouteActive,
  ]);

  // =================== ELEMENT
  return (
    <motion.nav 
      className="nav" 
      ref={navRef}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Aktif link işaret eden indicator */}
      <div className="nav__indicator" ref={indicatorRef}></div>
      <div className="nav__bg"></div>
      {/* Nav management kısmı (üst kısım) */}
      <div className="nav__management">
        <div className="nav__title">
          <div className="prefix">gri</div>
          <div className="colored">TMS</div>
        </div>
        {/* Telefon ekranında management bar'ı yöneten ve seçili management bar'ın verisini gösteren element */}
        <div
          className={`nav__management-navigator ${isManagementRouteActive ? "active" : ""} ${popManagementBar ? "management-link-selected" : ""}`}
          onClick={() => setPopManagementBar((prev) => !prev)}
        >
          <div className="nav__management-navigator__icon">
            {isManagementRouteActive ? (
              activeManagementRoute.icon
            ) : (
              <VscArrowUp className="arrow" />
            )}
          </div>
        </div>
        {/* Management linkleri (telefon ekranında pop up menü haline geliyor) */}
        <div
          className={`nav__group ${popManagementBar ? "show-management" : ""}`}
        >
          {visibleManagementRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className="nav__link"
              onClick={() => setPopManagementBar(false)}
            >
              {route.icon}
              <p className="nav__link-text">{route.name}</p>
            </NavLink>
          ))}
        </div>
      </div>
      {/* Nav bottom */}
      <div className="nav__group nav__group--bottom">
        <NavLink
          to={settingsRoute.path}
          className="nav__link"
          onClick={() => setPopManagementBar(false)}
        >
          {settingsRoute.icon}
          <p className="nav__link-text">{settingsRoute.name}</p>
        </NavLink>
        <div className="nav__link nav__link--logout" onClick={() => void handleLogout()}>
          <LiaPowerOffSolid /> <p className="nav__link-text">Çıkış Yap</p>
        </div>
      </div>
    </motion.nav>
  );
}

export default Navbar;
