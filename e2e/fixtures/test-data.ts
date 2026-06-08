/**
 * E2E Test Verileri
 * Testlerde kullanılan sabit kullanıcı bilgileri ve demo veriler.
 * Veritabanı seed script'leriyle uyumlu olmalıdır.
 */

/** Admin kullanıcı bilgileri (seeder.ts ile oluşturulur) */
export const ADMIN_USER = {
  username: 'admin',
  password: '1234',
} as const;

/**
 * Birim Sorumlusu bilgileri (seeder-demo.ts ile oluşturulur)
 * Şifre = kullanıcı adı
 */
export const RESPONSIBLE_USER = {
  username: 'kuzey_ik',
  password: 'kuzey_ik',
} as const;

/** Test personeli bilgileri — yeni çalışan ekleme testlerinde kullanılır */
export const TEST_EMPLOYEE = {
  tcNo: '12345678901',
  firstName: 'Test',
  lastName: 'Çalışan',
  ibanNo: 'TR000000000000000000000001',
  phoneNo: '05551234567',
  startDate: '2025-01-15',
} as const;

/** Yerleşke / birim test verileri */
export const TEST_LOCATION = {
  name: 'E2E Test Yerleşkesi',
  programNo: 'PRG-E2E',
} as const;

export const TEST_UNIT = {
  name: 'E2E Test Birimi',
} as const;

/** Uygulama URL'leri */
export const URLS = {
  auth: '/auth',
  home: '/',
  employees: '/employees',
  users: '/users',
  locations: '/locations',
  settings: '/settings',
  auditLogs: '/audit-logs',
} as const;
