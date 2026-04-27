/* ========================================================================
   DATABASE SCHEMA (VERİTABANI ŞEMASI)
   Drizzle ORM kullanarak veritabanı tablolarını ve ilişkilerini tanımlar.
   Tüm tablolar 'app' şeması altında toplanmıştır.
   ======================================================================== */
import {
  pgSchema, uuid, text, timestamp, jsonb, boolean, date, numeric, integer, varchar, unique, index
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// Tüm tablolar 'app' şeması altında yer alır
export const appSchema = pgSchema('app');

// LOKASYONLAR (Şantiye/Proje Alanları)
export const locations = appSchema.table('locations', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  name: text('name').notNull(),
  programNo: text('program_no').notNull().unique(), // Proje takip numarası
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// BİRİMLER (Lokasyon altındaki bölümler/ekipler)
export const units = appSchema.table('units', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  locationId: uuid('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    locationIdIdx: index('idx_units_location_id').on(table.locationId),
    locationNameUnq: unique('units_location_id_name_key').on(table.locationId, table.name),
  };
});

// KULLANICILAR (Sistem kullanıcıları: Admin ve Sorumlu)
export const users = appSchema.table('users', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // ADMIN, RESPONSIBLE
  status: text('status').notNull(), // PENDING, ACTIVE, EXPIRED
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  expiryDate: date('expiry_date'), // Hesap geçerlilik son tarihi
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    locationIdIdx: index('idx_users_location_id').on(table.locationId),
    unitIdIdx: index('idx_users_unit_id').on(table.unitId),
    roleCheck: sql`CHECK (role = ANY (ARRAY['ADMIN'::text, 'RESPONSIBLE'::text]))`,
    statusCheck: sql`CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'EXPIRED'::text]))`,
    responsibleCheck: sql`CHECK ((role <> 'RESPONSIBLE'::text) OR ((unit_id IS NOT NULL) AND (location_id IS NOT NULL)))`,
  };
});

// PERSONELLER (Çalışanlar)
export const employees = appSchema.table('employees', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  tcNo: text('tc_no').unique(),
  ibanNo: text('iban_no'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
}, (table) => {
  return {
    unitIdIdx: index('idx_employees_unit_id').on(table.unitId),
    dateCheck: sql`CHECK ((end_date IS NULL) OR (end_date >= start_date))`,
  };
});

// DUYURULAR
export const announcements = appSchema.table('announcements', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// DUYURU OKUMA KAYITLARI
export const announcementReads = appSchema.table('announcement_reads', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  announcementId: uuid('announcement_id').references(() => announcements.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at', { withTimezone: false }).defaultNow(),
}, (table) => {
  return {
    userAnnouncementUnq: unique('announcement_reads_user_id_announcement_id_key').on(table.userId, table.announcementId),
  };
});

// DENETİM GÜNLÜKLERİ (Audit Logs)
export const auditLogs = appSchema.table('audit_logs', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  action: varchar('action', { length: 64 }).notNull(),
  actorUsername: varchar('actor_username', { length: 64 }).notNull(),
  actorRole: varchar('actor_role', { length: 32 }),
  entityType: varchar('entity_type', { length: 32 }),
  entityId: uuid('entity_id'),
  summary: text('summary').notNull(),
  changes: jsonb('changes').default(sql`'[]'::jsonb`).notNull(),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    actionIdx: index('idx_audit_logs_action').on(table.action),
    actorUsernameIdx: index('idx_audit_logs_actor_username').on(table.actorUsername),
    createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
  };
});

// DÖNEMLER (Puantaj ayları)
export const periods = appSchema.table('periods', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  isLocked: boolean('is_locked').default(true).notNull(), // Kilitli dönemlerde değişiklik yapılamaz
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
}, (table) => {
  return {
    yearMonthUnq: unique('periods_year_month_key').on(table.year, table.month),
    dateCheck: sql`CHECK (end_date >= start_date)`,
    monthCheck: sql`CHECK ((month >= 1) AND (month <= 12))`,
  };
});

// SİSTEM AYARLARI
export const settings = appSchema.table('settings', {
  id: integer('id').default(1).primaryKey(),
  dailyWage: numeric('daily_wage', { precision: 10, scale: 2 }).default('500.00').notNull(),
  maxWeeklyDays: integer('max_weekly_days').default(6).notNull(),
  programStartDate: date('program_start_date').notNull(),
  programEndDate: date('program_end_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow(),
}, (table) => {
  return {
    idCheck: sql`CHECK (id = 1)`,
    wageCheck: sql`CHECK (daily_wage > (0)::numeric)`,
    weeklyCheck: sql`CHECK (max_weekly_days > 0)`,
    dateCheck: sql`CHECK (program_end_date > program_start_date)`,
  };
});

// PUANTAJLAR (Ana kayıtlar)
export const timesheets = appSchema.table('timesheets', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id').notNull().references(() => periods.id, { onDelete: 'restrict' }),
  unitId: uuid('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    employeeIdIdx: index('idx_timesheets_employee_id').on(table.employeeId),
    unitPeriodIdx: index('idx_timesheets_unit_period').on(table.unitId, table.periodId),
    employeePeriodUnq: unique('timesheets_employee_id_period_id_key').on(table.employeeId, table.periodId),
  };
});

// PUANTAJ GÜNLERİ (Günlük çalışma işaretlemeleri)
export const timesheetDays = appSchema.table('timesheet_days', {
  id: uuid('id').default(sql`public.uuid_generate_v4()`).primaryKey(),
  timesheetId: uuid('timesheet_id').notNull().references(() => timesheets.id, { onDelete: 'cascade' }),
  day: date('day').notNull(),
  markerCode: text('marker_code').notNull(), // Ç, X, R vb.
  note: text('note'),
}, (table) => {
  return {
    tsDayIdx: index('idx_timesheet_days_ts_day').on(table.timesheetId, table.day),
    timesheetDayUnq: unique('timesheet_days_timesheet_id_day_key').on(table.timesheetId, table.day),
  };
});

// İLİŞKİ TANIMLAMALARI (Drizzle Relations)
export const locationsRelations = relations(locations, ({ many }) => ({
  units: many(units),
  users: many(users),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  location: one(locations, { fields: [units.locationId], references: [locations.id] }),
  employees: many(employees),
  timesheets: many(timesheets),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  location: one(locations, { fields: [users.locationId], references: [locations.id] }),
  unit: one(units, { fields: [users.unitId], references: [units.id] }),
  announcementReads: many(announcementReads),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  unit: one(units, { fields: [employees.unitId], references: [units.id] }),
  timesheets: many(timesheets),
}));

export const announcementsRelations = relations(announcements, ({ many }) => ({
  reads: many(announcementReads),
}));

export const announcementReadsRelations = relations(announcementReads, ({ one }) => ({
  user: one(users, { fields: [announcementReads.userId], references: [users.id] }),
  announcement: one(announcements, { fields: [announcementReads.announcementId], references: [announcements.id] }),
}));

export const periodsRelations = relations(periods, ({ many }) => ({
  timesheets: many(timesheets),
}));

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  employee: one(employees, { fields: [timesheets.employeeId], references: [employees.id] }),
  period: one(periods, { fields: [timesheets.periodId], references: [periods.id] }),
  unit: one(units, { fields: [timesheets.unitId], references: [units.id] }),
  days: many(timesheetDays),
}));

export const timesheetDaysRelations = relations(timesheetDays, ({ one }) => ({
  timesheet: one(timesheets, { fields: [timesheetDays.timesheetId], references: [timesheets.id] }),
}));
