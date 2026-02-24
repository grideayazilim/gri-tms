// =================== ICON IMPORTLARI
// Puantaj yönetimi
import { AiOutlineFile } from "react-icons/ai";
// Yerleşke ve Birimler
import { PiBuildingOffice } from "react-icons/pi";
// Birim sorumluları
import { LiaUserTieSolid } from "react-icons/lia";
// Çalışanlar
import { PiHardHat } from "react-icons/pi";
// İşlem kayıtları
import { RiFileList3Line } from "react-icons/ri";
// Ayarlar
import { IoSettingsOutline } from "react-icons/io5";

// =================== PAGE IMPORTLARI
import TimesheetPage from '../pages/TimesheetPage/TimesheetPage';
import SettingsPage from '../pages/SettingsPage/SettingsPage';
import LocationsPage from '../pages/LocationsPage/LocationsPage';
import EmployeesPage from '../pages/EmployeesPage/EmployeesPage';
import UsersPage from '../pages/UsersPage/UsersPage';
import LogsPage from '../pages/LogsPage/LogsPage';
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage';
import AuthPage from '../pages/AuthPage/AuthPage';

// Public routes (herkes erişebilir, authentication gerektirmez)
export const publicRoutes = [
  {
    path: '/auth',
    element: AuthPage,
    name: 'Giriş',
  },
];

// Management routes (giriş yapmış herkes görebilir, admin değilse sadece Puantaj İşaretleme görecek)
export const managementRoutes = [
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
    name: 'Yerleşke Birimler',
    icon: <PiBuildingOffice />,
    adminOnly: true, // Sadece admin
  },
  {
    path: '/users',
    element: UsersPage,
    name: 'Birim Sorumluları',
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
    path: '/logs',
    element: LogsPage,
    name: 'İşlem Kayıtları',
    icon: <RiFileList3Line />,
    adminOnly: true,
  },
];

// Settings route (ayrı kategori, herkes görebilir)
export const settingsRoute = {
  path: '/settings',
  element: SettingsPage,
  name: 'Ayarlar',
  icon: <IoSettingsOutline />,
};

// 404 route
export const notFoundRoute = {
  path: '*',
  element: NotFoundPage,
  name: '404',
};

// Tüm protected routes (managementRoutes + settingsRoute)
export const protectedRoutes = [...managementRoutes, settingsRoute];

// Admin routes (sadece adminOnly: true olanlar)
export const adminRoutes = managementRoutes.filter(route => route.adminOnly);
