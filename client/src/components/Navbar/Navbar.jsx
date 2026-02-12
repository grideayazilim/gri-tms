// =================== ICON IMPORTLARI
// Puantaj yönetimi
import { AiOutlineFile } from "react-icons/ai";
// Yerleşke ve Birimler
import { PiBuildingOffice } from "react-icons/pi";
// Birim sorumluları
import { LiaUserTieSolid } from "react-icons/lia";
// Çalışanlar
import { PiHardHat } from "react-icons/pi";
// Ayarlar
import { IoSettingsOutline } from "react-icons/io5";
// Logout
import { LiaPowerOffSolid } from "react-icons/lia";
// Mobile pop
import { VscArrowUp } from "react-icons/vsc";

// =================== CORE IMPORTLAR
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { useState, useEffect, useRef } from "react";
import "./Navbar.scss";

const navManagementRoutes = [
  {
    path: "/timesheet",
    title: "Puantaj İşaretleme",
    icon: <AiOutlineFile />,
  },
  {
    path: "/locations",
    title: "Yerleşkeler ve Birimler",
    icon: <PiBuildingOffice />,
  },
  {
    path: "/users",
    title: "Kullanıcılar",
    icon: <LiaUserTieSolid className="tie-icon" />,
  },
  {
    path: "/employees",
    title: "Çalışanlar",
    icon: <PiHardHat />,
  },
];

function Navbar() {
  // ========== HOOK TANIMLARI
  const { isPhone, isTablet, isDesktop } = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();

  // ========== STATE'LER
  // Telefon ekranında management bar'ının görünüp görünmediği
  const [popManagementBar, setPopManagementBar] = useState(false);

  // ========== REFERANSLAR
  // Dikey ve yatay hareket indicator için
  const indicatorRef = useRef(null);
  const navRef = useRef(null);

  // ========== YARDIMCI FONKSİYONLAR
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Bulunulan sayfanın route'unun array'deki objesini alır
  const activeManagementRoute =
    navManagementRoutes.find((r) => r.path === location.pathname) || null;

  // Yukarıdaki değişken undefined ise (route, management route değil) bu değeri false yap
  const isManagementRouteActive = !!activeManagementRoute;

  // ========== USEEFFECT KISMI
  // Indicator movement
  useEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;

    const active = nav.querySelector(".nav__link.active");
    const navRect = nav.getBoundingClientRect();

    // Dikey indicatör stili (desktop'ta)
    const setVerticalIndicator = (rect) => {
      Object.assign(indicator.style, {
        left: "0px",
        top: rect.top - navRect.top + "px",
        height: rect.height + "px",
        width: "5px",
      });
    };

    // Yatay indicatör stili (tablet ve telefonda)
    const setHorizontalIndicator = (rect) => {
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
        const managementNav = nav.querySelector(".nav__management-navigator");
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
    navManagementRoutes,
    isPhone,
    isTablet,
    isDesktop,
    isManagementRouteActive,
  ]);

  // =================== ELEMENT
  return (
    <nav className="nav" ref={navRef}>
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
          {navManagementRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className="nav__link"
              onClick={() => setPopManagementBar(false)}
            >
              {route.icon}
              <p className="nav__link-text">{route.title}</p>
            </NavLink>
          ))}
        </div>
      </div>
      {/* Nav bottom */}
      <div className="nav__group nav__group--bottom">
        <NavLink
          to="/settings"
          className="nav__link"
          onClick={() => setPopManagementBar(false)}
        >
          <IoSettingsOutline />
          <p className="nav__link-text">Ayarlar</p>
        </NavLink>
        <div className="nav__link nav__link--logout" onClick={handleLogout}>
          <LiaPowerOffSolid /> <p className="nav__link-text">Çıkış Yap</p>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
