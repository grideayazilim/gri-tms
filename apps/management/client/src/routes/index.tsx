/* ========================================================================
   ROUTE KONFİGÜRASYONU
   Uygulama sayfa yönlendirmeleri ve navigasyon yapılandırması.
   ======================================================================== */
import type { ComponentType, ReactNode } from 'react';

// =================== ICON IMPORTLARI
// Puantaj yönetimi
import { AiOutlineFile } from 'react-icons/ai';
// Yerleşke ve Birimler
import { PiBuildingOffice } from 'react-icons/pi';
// Kullanıcılar
import { LiaUserTieSolid } from 'react-icons/lia';
// Çalışanlar
import { PiHardHat } from 'react-icons/pi';
// İşlem kayıtları
import { RiFileList3Line } from 'react-icons/ri';
// Ayarlar
import { IoSettingsOutline } from 'react-icons/io5';

// =================== PAGE IMPORTLARI
import TimesheetPage from '../pages/TimesheetPage/TimesheetPage';
import SettingsPage from '../pages/SettingsPage/SettingsPage';
import LocationsPage from '../pages/LocationsPage/LocationsPage';
import EmployeesPage from '../pages/EmployeesPage/EmployeesPage';
import UsersPage from '../pages/UsersPage/UsersPage';
import AuditLogsPage from '../pages/AuditLogsPage/AuditLogsPage';
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage';
import AuthPage from '../pages/AuthPage/AuthPage';

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface RouteConfig {
  path: string;
  element: ComponentType;
  name: string;
  icon?: ReactNode;
  adminOnly?: boolean;
}

// ─── Route Tanımları ──────────────────────────────────────────────────────────

// Public routes (herkes erişebilir, authentication gerektirmez)
export const publicRoutes: RouteConfig[] = [
  {
    path: '/auth',
    element: AuthPage,
    name: 'Giriş',
  },
];

// Management routes (giriş yapmış herkes görebilir, admin değilse sadece Puantaj İşaretleme görecek)
export const managementRoutes: RouteConfig[] = [
  {
    path: '/',
    element: TimesheetPage,
    name: 'Puantaj İşaretleme',
    icon: <AiOutlineFile />,
    adminOnly: false, // Herkes görebilir
  },
  {
    path: '/locations',
    element: LocationsPage,
    name: 'Yerleşke ve Birimler',
    icon: <PiBuildingOffice />,
    adminOnly: true, // Sadece admin
  },
  {
    path: '/users',
    element: UsersPage,
    name: 'Kullanıcılar',
    icon: <LiaUserTieSolid className="tie-icon" />,
    adminOnly: true,
  },
  {
    path: '/employees',
    element: EmployeesPage,
    name: 'Çalışanlar',
    icon: <PiHardHat />,
    adminOnly: true,
  },
  {
    path: '/audit-logs',
    element: AuditLogsPage,
    name: 'İşlem Kayıtları',
    icon: <RiFileList3Line />,
    adminOnly: true,
  },
];

// Settings route (ayrı kategori, herkes görebilir)
export const settingsRoute: RouteConfig = {
  path: '/settings',
  element: SettingsPage,
  name: 'Ayarlar',
  icon: <IoSettingsOutline />,
};

// 404 route
export const notFoundRoute: RouteConfig = {
  path: '*',
  element: NotFoundPage,
  name: '404',
};

// Tüm protected routes (sadece adminOnly olmayanlar)
export const protectedRoutes: RouteConfig[] = [...managementRoutes, settingsRoute].filter(route => !route.adminOnly);

// Admin routes (sadece adminOnly: true olanlar)
export const adminRoutes: RouteConfig[] = managementRoutes.filter(route => route.adminOnly);
