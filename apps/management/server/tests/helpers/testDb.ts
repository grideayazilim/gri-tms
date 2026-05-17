/* ========================================================================
   TEST DB YARDIMCI FONKSİYONLARI
   Integration testlerde kullanılacak DB seed ve temizleme fonksiyonları.
   ======================================================================== */
import { sql } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { faker } from '@faker-js/faker/locale/tr'
import { db, pool } from '../../src/config/database.js'
import {
  users,
  locations,
  units,
  employees,
  periods,
  settings,
  announcements,
} from '../../database/schema.js'

/* ─── Veritabanı Temizleme ─────────────────────────────────────────── */

/**
 * Tüm tabloları temizler. Her test suite başında çağrılmalı.
 * Sıra önemli: FK constraint'leri nedeniyle bağımlı tablolar önce silinir.
 */
export async function cleanDb(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      app.timesheet_days,
      app.timesheets,
      app.periods,
      app.announcement_reads,
      app.announcements,
      app.employees,
      app.audit_logs,
      app.users,
      app.units,
      app.locations,
      app.settings
    RESTART IDENTITY CASCADE
  `)
}

/* ─── Kullanıcı Yardımcıları ───────────────────────────────────────── */

export interface TestUser {
  id: string
  username: string
  password: string
  role: 'ADMIN' | 'RESPONSIBLE'
  token: string      // Hazır JWT access token
  cookie: string     // Cookie header'ı için formatlanmış string
}

/**
 * Test admin kullanıcısı oluşturur ve JWT token üretir.
 */
export async function createAdminUser(overrides: { username?: string; password?: string } = {}): Promise<TestUser> {
  const username = overrides.username ?? `admin_${faker.string.alphanumeric(6)}`
  const password = overrides.password ?? 'Test@1234'
  const passwordHash = await bcrypt.hash(password, 10)

  const [user] = await db.insert(users).values({
    username,
    passwordHash,
    role: 'ADMIN',
    status: 'ACTIVE',
  }).returning()

  if (!user) throw new Error('Admin kullanıcı oluşturulamadı')

  const payload = { id: user.id, username: user.username, role: user.role }
  const token = jwt.sign(payload, process.env['ACCESS_TOKEN_SECRET']!, { expiresIn: 900 })
  const cookie = `accessToken=${token}`

  return { id: user.id, username, password, role: 'ADMIN', token, cookie }
}

/**
 * Test RESPONSIBLE kullanıcısı oluşturur (birim sorumlusu).
 * locationId ve unitId zorunlu.
 */
export async function createResponsibleUser(locationId: string, unitId: string, overrides: { username?: string } = {}): Promise<TestUser> {
  const username = overrides.username ?? `resp_${faker.string.alphanumeric(6)}`
  const password = 'Test@1234'
  const passwordHash = await bcrypt.hash(password, 10)

  const [user] = await db.insert(users).values({
    username,
    passwordHash,
    role: 'RESPONSIBLE',
    status: 'ACTIVE',
    locationId,
    unitId,
  }).returning()

  if (!user) throw new Error('Responsible kullanıcı oluşturulamadı')

  const payload = { id: user.id, username: user.username, role: user.role, locationId, unitId }
  const token = jwt.sign(payload, process.env['ACCESS_TOKEN_SECRET']!, { expiresIn: 900 })
  const cookie = `accessToken=${token}`

  return { id: user.id, username, password, role: 'RESPONSIBLE', token, cookie }
}

/* ─── Lokasyon & Birim Yardımcıları ───────────────────────────────── */

export interface TestLocation {
  id: string
  name: string
  programNo: string
}

export async function createLocation(overrides: { name?: string; programNo?: string } = {}): Promise<TestLocation> {
  const [loc] = await db.insert(locations).values({
    name: overrides.name ?? faker.location.city(),
    programNo: overrides.programNo ?? faker.string.alphanumeric(6).toUpperCase(),
  }).returning()

  if (!loc) throw new Error('Lokasyon oluşturulamadı')
  return { id: loc.id, name: loc.name, programNo: loc.programNo }
}

export interface TestUnit {
  id: string
  locationId: string
  name: string
}

export async function createUnit(locationId: string, overrides: { name?: string } = {}): Promise<TestUnit> {
  const [unit] = await db.insert(units).values({
    locationId,
    name: overrides.name ?? faker.commerce.department(),
  }).returning()

  if (!unit) throw new Error('Birim oluşturulamadı')
  return { id: unit.id, locationId, name: unit.name }
}

/* ─── Personel Yardımcıları ────────────────────────────────────────── */

export interface TestEmployee {
  id: string
  unitId: string
  tcNo: string
  firstName: string
  lastName: string
}

export async function createEmployee(unitId: string, overrides: { tcNo?: string; isActive?: boolean } = {}): Promise<TestEmployee> {
  const tcNo = overrides.tcNo ?? faker.string.numeric(11)
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()

  const [emp] = await db.insert(employees).values({
    unitId,
    tcNo,
    firstName,
    lastName,
    startDate: '2024-01-01',
    isActive: overrides.isActive ?? true,
    ibanNo: 'TR' + faker.string.numeric(24),
  }).returning()

  if (!emp) throw new Error('Personel oluşturulamadı')
  return { id: emp.id, unitId, tcNo, firstName, lastName }
}

/* ─── Dönem Yardımcıları ───────────────────────────────────────────── */

export interface TestPeriod {
  id: string
  year: number
  month: number
}

export async function createPeriod(year: number, month: number, overrides: { isLocked?: boolean } = {}): Promise<TestPeriod> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-28`

  const [period] = await db.insert(periods).values({
    year,
    month,
    startDate,
    endDate,
    isLocked: overrides.isLocked ?? false,
  }).returning()

  if (!period) throw new Error('Dönem oluşturulamadı')
  return { id: period.id, year, month }
}

/* ─── Sistem Ayarları Yardımcısı ───────────────────────────────────── */

export async function createSettings(): Promise<void> {
  // Eğer settings kaydı yoksa oluştur
  await db.execute(sql`
    INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
    VALUES (1, 500.00, 6, '2024-01-01', '2026-12-31')
    ON CONFLICT (id) DO NOTHING
  `)
}

/* ─── Duyuru Yardımcısı ─────────────────────────────────────────────── */

export interface TestAnnouncement {
  id: string
  title: string
  content: string
}

export async function createAnnouncement(overrides: { title?: string; content?: string } = {}): Promise<TestAnnouncement> {
  const [ann] = await db.insert(announcements).values({
    title: overrides.title ?? faker.lorem.words(4),
    content: overrides.content ?? faker.lorem.sentences(2),
  }).returning()

  if (!ann) throw new Error('Duyuru oluşturulamadı')
  return { id: ann.id, title: ann.title, content: ann.content }
}

/* ─── Pool Erişimi ─────────────────────────────────────────────────── */

export { pool, db }
