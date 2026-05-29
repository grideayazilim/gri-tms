// MSW (Mock Service Worker) Cevap Yönlendiricileri (Handlers)
// Frontend kodumuz internete (gerçek backend'e) istek attığında,
// bu dosya araya girer ve gerçek sunucuya gitmesini engelleyip sahte cevaplar döndürür.

import { http, HttpResponse } from 'msw';

// ─── Temel Mock Verileri ──────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  username: 'testadmin',
  role: 'ADMIN',
  locationId: null,
  unitId: null,
};

const mockLocation = { id: 1, name: 'Merkez Yerleşke', programNo: '101' };
const mockUnit = { id: 1, name: 'Yazılım Birimi', locationId: 1 };
const mockEmployee = {
  id: 'emp-1',
  tcNo: '12345678901',
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
  isActive: true,
  unit: { id: 1, name: 'Yazılım Birimi', location: { id: 1, name: 'Merkez Yerleşke' } },
};
const mockPeriod = { id: 'p1', year: 2024, month: 5, isLocked: false, startDate: '2024-05-01', endDate: '2024-05-31' };

export const handlers = [
  // ─── Sağlık Kontrolü ───────────────────────────────────────────────────────
  http.get('*/api/health', () => HttpResponse.json({ status: 'ok' })),

  // ─── Kimlik Doğrulama (Auth) ───────────────────────────────────────────────
  http.get('*/api/auth/me', () =>
    HttpResponse.json({ success: true, data: { user: mockUser } }),
  ),

  http.post('*/api/auth/login', () =>
    HttpResponse.json({ success: true, data: { user: mockUser } }),
  ),

  http.post('*/api/auth/register', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.post('*/api/auth/logout', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.post('*/api/auth/refresh', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.put('*/api/users/me', () =>
    HttpResponse.json({ success: true, data: { user: mockUser } }),
  ),

  // ─── Yerleşke ve Birim ─────────────────────────────────────────────────────
  http.get('*/api/locationAndUnits/locations', () =>
    HttpResponse.json({ success: true, data: { locations: [mockLocation] } }),
  ),

  http.get('*/api/locationAndUnits/units', () =>
    HttpResponse.json({ success: true, data: { units: [mockUnit] } }),
  ),

  // Bir yerleşkeye ait birimleri getir
  http.get('*/api/locationAndUnits/locations/:locationId/units', () =>
    HttpResponse.json({ success: true, data: { units: [mockUnit] } }),
  ),

  http.post('*/api/locationAndUnits/locations', () =>
    HttpResponse.json({ success: true, data: { location: mockLocation } }),
  ),

  http.put('*/api/locationAndUnits/locations/:id', () =>
    HttpResponse.json({ success: true, data: { location: mockLocation } }),
  ),

  http.delete('*/api/locationAndUnits/locations/:id', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  // Sync — PUT metodu (POST değil)
  http.put('*/api/locationAndUnits/locations/:id/sync', () =>
    HttpResponse.json({ success: true, data: { location: mockLocation } }),
  ),

  // Birim CRUD
  http.post('*/api/locationAndUnits/units', () =>
    HttpResponse.json({ success: true, data: { unit: mockUnit } }),
  ),

  http.put('*/api/locationAndUnits/units/:id', () =>
    HttpResponse.json({ success: true, data: { unit: mockUnit } }),
  ),

  http.delete('*/api/locationAndUnits/units/:id', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  // ─── Çalışanlar ────────────────────────────────────────────────────────────
  http.get('*/api/employees', () =>
    HttpResponse.json({
      success: true,
      data: { employees: [mockEmployee], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } },
    }),
  ),

  http.post('*/api/employees', () =>
    HttpResponse.json({ success: true, data: { employee: mockEmployee } }),
  ),

  http.put('*/api/employees/:id', () =>
    HttpResponse.json({ success: true, data: { employee: mockEmployee } }),
  ),

  http.delete('*/api/employees/:id', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.post('*/api/employees/bulk-import', () =>
    HttpResponse.json({ success: true, data: { successCount: 1, failures: [] } }),
  ),

  // ─── Kullanıcılar ──────────────────────────────────────────────────────────
  http.get('*/api/users', () =>
    HttpResponse.json({
      success: true,
      data: {
        users: [
          { id: 'u1', username: 'admin', role: 'ADMIN', isActive: true, unit: null },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    }),
  ),

  http.put('*/api/users/:id', () =>
    HttpResponse.json({ success: true, data: { user: mockUser } }),
  ),

  http.delete('*/api/users/:id', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  // ─── Puantaj ───────────────────────────────────────────────────────────────
  http.get('*/api/timesheets', () =>
    HttpResponse.json({
      success: true,
      data: {
        rows: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
    }),
  ),

  http.post('*/api/timesheets', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.get('*/api/timesheets/periods', () =>
    HttpResponse.json({ success: true, data: { periods: [mockPeriod] } }),
  ),

  http.put('*/api/timesheets/periods/:id/lock', () =>
    HttpResponse.json({ success: true, data: { period: { ...mockPeriod, isLocked: true } } }),
  ),

  http.patch('*/api/timesheets/:id/lock', () =>
    HttpResponse.json({ success: true, data: { period: { ...mockPeriod, isLocked: true } } }),
  ),

  // ─── Ayarlar ───────────────────────────────────────────────────────────────
  http.get('*/api/settings/system', () =>
    HttpResponse.json({
      success: true,
      data: {
        settings: {
          dailyWage: 100,
          maxWeeklyDays: 5,
          programStartDate: '2024-01-01',
          programEndDate: '2024-12-31',
        },
      },
    }),
  ),

  http.put('*/api/settings/system', () =>
    HttpResponse.json({
      success: true,
      data: {
        settings: {
          dailyWage: 200,
          maxWeeklyDays: 6,
          programStartDate: '2024-01-01',
          programEndDate: '2024-12-31',
        },
      },
    }),
  ),

  http.get('*/api/settings/pending-users', () =>
    HttpResponse.json({ success: true, data: { pendingUsers: [] } }),
  ),

  http.post('*/api/settings/pending-users/:id/approve', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.delete('*/api/settings/pending-users/:id/reject', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.post('*/api/settings/reset', () =>
    new HttpResponse(new Blob(['backup'], { type: 'application/zip' })),
  ),

  // ─── Duyurular ─────────────────────────────────────────────────────────────
  http.get('*/api/announcements', () =>
    HttpResponse.json({ success: true, data: { announcements: [] } }),
  ),

  http.post('*/api/announcements', () =>
    HttpResponse.json({ success: true, data: { announcement: {} } }),
  ),

  http.put('*/api/announcements/:id', () =>
    HttpResponse.json({ success: true, data: { announcement: {} } }),
  ),

  http.delete('*/api/announcements/:id', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  http.get('*/api/announcements/unread-count', () =>
    HttpResponse.json({ success: true, data: { count: 0 } }),
  ),

  http.put('*/api/announcements/:id/mark-read', () =>
    HttpResponse.json({ success: true, data: {} }),
  ),

  // ─── Denetim Kayıtları ─────────────────────────────────────────────────────
  http.get('*/api/audit-logs', () =>
    HttpResponse.json({
      success: true,
      data: {
        logs: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      },
    }),
  ),

  // ─── İçe Aktarım ──────────────────────────────────────────────────────────
  http.post('*/api/import/bulk-employees', () =>
    HttpResponse.json({ success: true, data: { successCount: 1, failures: [] } }),
  ),

  // ─── Export ────────────────────────────────────────────────────────────────
  http.get('*/api/export/timesheet', () =>
    new HttpResponse(new Blob(['excel'], { type: 'application/octet-stream' })),
  ),

  http.get('*/api/export/simple', () =>
    new HttpResponse(new Blob(['excel'], { type: 'application/octet-stream' })),
  ),

  http.get('*/api/export/bot', () =>
    new HttpResponse(new Blob(['excel'], { type: 'application/octet-stream' })),
  ),

  // ─── Tatil Günleri ─────────────────────────────────────────────────────────
  http.get('*/api/holidays', () =>
    HttpResponse.json({
      success: true,
      data: {
        holidays: [
          { date: '2024-01-01', name: 'Yılbaşı' },
          { date: '2024-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
        ],
      },
    }),
  ),

  // ─── Eski Settings uyumluluğu (sayfa testleri tarafından kullanılabilir) ───
  http.get('*/api/settings', () =>
    HttpResponse.json({
      success: true,
      data: {
        settings: {
          dailyWage: 100,
          maxWeeklyDays: 5,
          programStartDate: '2024-01-01',
          programEndDate: '2024-12-31',
        },
      },
    }),
  ),

  http.put('*/api/settings', () =>
    HttpResponse.json({ success: true, data: { settings: {} } }),
  ),
];
