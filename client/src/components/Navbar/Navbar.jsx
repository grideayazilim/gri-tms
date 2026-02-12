import { AiOutlineFile } from "react-icons/ai";
import { PiBuildingOffice } from "react-icons/pi";
import { LiaUserTieSolid } from "react-icons/lia";
import { PiHardHat } from "react-icons/pi";
import { IoSettingsOutline } from "react-icons/io5";
import { LiaPowerOffSolid } from "react-icons/lia";
import { VscArrowUp } from "react-icons/vsc";

import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "./Navbar.scss";

function Navbar() {
  const location = useLocation();
  const [activeManagementRoute, setActiveManagementRoute] = useState({
    title: "",
    icon: null,
  });
  const [popManagementBar, setPopManagementBar] = useState(false);
  const indicatorRef = useRef(null);
  const navRef = useRef(null);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const isManagementRouteActive = navManagementRoutes.some(
    (r) => r.path === location.pathname,
  );

  // Active indicator move
  // Active indicator move
  useEffect(() => {
    const active = navRef.current?.querySelector(".nav__link.active");
    const indicator = indicatorRef.current;
    const nav = navRef.current;

    if (!indicator || !nav) return;

    const navRect = nav.getBoundingClientRect();

    const isPhone = window.matchMedia("(max-width: 500px)").matches;
    const isTablet =
      window.matchMedia("(max-width: 1024px)").matches && !isPhone;

    if (isPhone) {
      indicator.style.top = "auto";
      indicator.style.bottom = "0px";
      indicator.style.height = "5px";

      if (isManagementRouteActive) {
        // PHONE + management active => navigator'a yapış
        const managementNav = nav.querySelector(".nav__management-navigator");
        if (!managementNav) return;

        const rect = managementNav.getBoundingClientRect();
        indicator.style.left = rect.left - navRect.left + "px";
        indicator.style.width = rect.width + "px";
      } else {
        // PHONE + management değil => aktif linke git (settings vs)
        if (!active) return;
        const activeRect = active.getBoundingClientRect();
        indicator.style.left = activeRect.left - navRect.left + "px";
        indicator.style.width = activeRect.width + "px";
      }
    } else if (isTablet) {
      if (!active) return;
      const activeRect = active.getBoundingClientRect();

      indicator.style.top = "auto";
      indicator.style.bottom = "0px";
      indicator.style.left = activeRect.left - navRect.left + "px";
      indicator.style.width = activeRect.width + "px";
      indicator.style.height = "5px";
    } else {
      if (!active) return;
      const activeRect = active.getBoundingClientRect();

      indicator.style.left = "0px";
      indicator.style.top = activeRect.top - navRect.top + "px";
      indicator.style.height = activeRect.height + "px";
      indicator.style.width = "5px";
    }
  }, [location, navManagementRoutes]);

  useEffect(() => {
    const r =
      navManagementRoutes.find((route) => route.path === location.pathname) ||
      null;

    setActiveManagementRoute({
      title: r?.title ?? "",
      icon: r?.icon ?? null,
    });
  }, [location]);

  return (
    <nav className="nav" ref={navRef}>
      <div className="nav__indicator" ref={indicatorRef}></div>

      <div className="nav__bg"></div>

      <div className="nav__management">
        <div
          className={`nav__management-navigator ${isManagementRouteActive ? "active" : ""} ${popManagementBar ? "popped" : ""}`}
          onClick={() => setPopManagementBar((prev) => !prev)}
        >
          <div className="nav__management-navigator__icon">
            {isManagementRouteActive ? (
              activeManagementRoute.icon
            ) : (
              <VscArrowUp />
            )}
          </div>
        </div>
        <div
          className={`nav__group ${popManagementBar ? "show-management" : ""}`}
        >
          {navManagementRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className="nav__link"
              onClick={() => setPopManagementBar((prev) => prev && false)}
            >
              {route.icon}
              <p className="nav__link-text">{route.title}</p>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="nav__group nav__group--bottom">
        <NavLink
          to="/settings"
          className="nav__link"
          onClick={() => setPopManagementBar((prev) => prev && false)}
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
