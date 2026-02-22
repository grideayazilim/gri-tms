// Placeholder components
const TimesheetPage = () => <div>Timesheet Page</div>;
const AnnouncementsPage = () => <div>Announcements Page</div>;
const SettingsPage = () => <div>Settings Page</div>;
const LocationsPage = () => <div>Locations Page</div>;
const EmployeesPage = () => <div>Employees Page</div>;
const UsersPage = () => <div>Users Page</div>;
const LogsPage = () => <div>Logs Page</div>;
const NotFoundPage = () => <div>404 - Sayfa bulunamadı</div>;

// Login page (public)
export const LoginPage = () => <div>Login Page Placeholder</div>;

// Protected routes (giriş yaptıktan sonra herkesin erişebileceği)
export const protectedRoutes = [
  {
    path: '/',
    element: TimesheetPage,
    name: 'Timesheet',
  },
  {
    path: '/announcements',
    element: AnnouncementsPage,
    name: 'Duyurular',
  },
  {
    path: '/settings',
    element: SettingsPage,
    name: 'Ayarlar',
  },
];

// Admin routes (sadece admin erişebilir)
export const adminRoutes = [
  {
    path: '/locations',
    element: LocationsPage,
    name: 'Yerleşkeler',
  },
  {
    path: '/employees',
    element: EmployeesPage,
    name: 'Çalışanlar',
  },
  {
    path: '/users',
    element: UsersPage,
    name: 'Kullanıcılar',
  },
  {
    path: '/logs',
    element: LogsPage,
    name: 'Loglar',
  },
];

// 404 route
export const notFoundRoute = {
  path: '*',
  element: NotFoundPage,
  name: '404',
};