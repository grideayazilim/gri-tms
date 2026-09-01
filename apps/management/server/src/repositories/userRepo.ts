/* ========================================================================
   USER REPOSITORY (KULLANICI VERİ ERİŞİM KATMANI)
   Kullanıcılarla ilgili tüm veritabanı sorgularını barındırır.
   Controller'lar iş mantığı + response shaping yapar; SQL burada yaşar.
   ======================================================================== */
import { eq, and, ne, ilike, sql, count } from 'drizzle-orm';

import type { DbExecutor } from '../types/db.js';
import { users, units, locations, settings } from '../../database/schema.js';
import type { UserRow } from '../../database/schema.js';
import { USER_ROLE, USER_STATUS } from '@timesheet/shared';
import type { CreatePendingUserParams, UserListFilters, UserListRow } from './types.js';


// ============================================================
// Repository fonksiyonları
// ============================================================

export async function findByUsername(
  executor: DbExecutor,
  username: string,
): Promise<UserRow | undefined> {
  const rows = await executor
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return rows[0];
}

export async function findById(
  executor: DbExecutor,
  id: string,
): Promise<UserRow | undefined> {
  const rows = await executor
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0];
}

/** Login/getMe gibi public endpoint'ler için passwordHash hariç döner */
export async function findPublicById(
  executor: DbExecutor,
  id: string,
): Promise<Omit<UserRow, 'passwordHash'> | undefined> {
  const rows = await executor
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      status: users.status,
      locationId: users.locationId,
      unitId: users.unitId,
      expiryDate: users.expiryDate,
      lastLoginAt: users.lastLoginAt,
      mustChangePassword: users.mustChangePassword,
      tokenVersion: users.tokenVersion,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0];
}

/**
 * Sistemde hedef kullanıcı dışında kaç aktif ADMIN kaldığını sayar.
 * Son admin'in silinmesini/yetkisinin düşürülmesini engellemek için kullanılır.
 */
export async function countOtherActiveAdmins(
  executor: DbExecutor,
  excludeUserId: string,
): Promise<number> {
  const rows = await executor
    .select({ n: count() })
    .from(users)
    .where(and(
      eq(users.role, USER_ROLE.ADMIN),
      eq(users.status, USER_STATUS.ACTIVE),
      ne(users.id, excludeUserId),
    ));
  return rows[0]?.n ?? 0;
}

/**
 * Zorunlu şifre değişimini tamamlar: şifreyi günceller, bayrağı temizler ve
 * token_version'ı artırarak eski oturumları geçersiz kılar.
 */
export async function completeInitialPasswordChange(
  executor: DbExecutor,
  id: string,
  passwordHash: string,
): Promise<UserRow | undefined> {
  const rows = await executor
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: false,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return rows[0];
}

/**
 * 7 günden eski, onaylanmamış kayıtları temizler.
 * Kayıt ucu kötüye kullanılırsa tablo ve bekleyen kullanıcı listesi şişmesin.
 */
export async function deleteStalePendingUsers(
  executor: DbExecutor,
  olderThanDays = 7,
): Promise<{ id: string; username: string }[]> {
  return await executor
    .delete(users)
    .where(and(
      eq(users.status, USER_STATUS.PENDING),
      sql`${users.createdAt} < now() - (${olderThanDays} * INTERVAL '1 day')`,
    ))
    .returning({ id: users.id, username: users.username });
}

export async function createPendingUser(
  executor: DbExecutor,
  params: CreatePendingUserParams,
): Promise<UserRow> {
  const { username, passwordHash, role, unitId, locationId } = params;

  // Expiry Date Mantığı: ADMIN rolü süresizdir (NULL).
  // Diğer roller için sistem bitiş tarihinden (program_end_date) 20 gün sonrası set edilir.
  const expiryDateExpr = sql<string | null>`CASE
    WHEN ${role} = ${USER_ROLE.ADMIN} THEN NULL
    ELSE (SELECT program_end_date + INTERVAL '20 days' FROM ${settings} LIMIT 1)
  END`;

  const rows = await executor
    .insert(users)
    .values({
      username,
      passwordHash,
      role,
      status: USER_STATUS.PENDING,
      unitId,
      locationId,
      expiryDate: expiryDateExpr,
    })
    .returning();

  const row = rows[0];
  if (!row) throw new Error('User insert returned no rows');
  return row;
}

export async function list(
  executor: DbExecutor,
  filters: UserListFilters,
  page: number,
  limit: number,
  offset: number,
): Promise<{ users: UserListRow[]; total: number }> {
  // Dinamik koşullar
  const conditions = [];
  if (filters.role) conditions.push(eq(users.role, filters.role));
  if (filters.status) conditions.push(eq(users.status, filters.status));
  if (filters.unitId) conditions.push(eq(users.unitId, filters.unitId));
  if (filters.locationId) conditions.push(eq(users.locationId, filters.locationId));
  if (filters.search) conditions.push(ilike(users.username, `%${filters.search.trim()}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count
  const countRows = await executor
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(users)
    .where(whereClause);
  const total = countRows[0]?.count ?? 0;

  // Data
  const dataRows = await executor
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      status: users.status,
      expiryDate: users.expiryDate,
      createdAt: users.createdAt,
      unitId: units.id,
      unitName: units.name,
      locationId: locations.id,
      locationName: locations.name,
    })
    .from(users)
    .leftJoin(units, eq(users.unitId, units.id))
    .leftJoin(locations, eq(users.locationId, locations.id))
    .where(whereClause)
    .orderBy(users.username)
    .limit(limit)
    .offset(offset);

  return { users: dataRows, total };
}

export async function updateUser(
  executor: DbExecutor,
  id: string,
  data: Partial<Pick<UserRow, 'role' | 'status' | 'unitId' | 'locationId' | 'expiryDate' | 'passwordHash' | 'mustChangePassword'>>,
  /** Yetki/şifre değişiminde mevcut token'ları geçersiz kıl */
  bumpTokenVersion = false,
): Promise<UserRow | undefined> {
  const rows = await executor
    .update(users)
    .set({
      ...data,
      ...(bumpTokenVersion ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return rows[0];
}

export async function deleteUser(
  executor: DbExecutor,
  id: string,
): Promise<{ id: string; username: string } | undefined> {
  const rows = await executor
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id, username: users.username });
  return rows[0];
}

export async function updateProfile(
  executor: DbExecutor,
  id: string,
  data: { username?: string | null; passwordHash: string; passwordChanged?: boolean },
): Promise<UserRow | undefined> {
  const rows = await executor
    .update(users)
    .set({
      ...(data.username != null ? { username: data.username } : {}),
      passwordHash: data.passwordHash,
      // Şifre değiştiyse eski oturumlar düşsün
      ...(data.passwordChanged ? { tokenVersion: sql`${users.tokenVersion} + 1` } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();
  return rows[0];
}

// Lookup helper'lar locationRepo'ya taşındı; userRepo'dan re-export edilir
export { lookupUnitNames, lookupLocationNames } from './locationRepo.js';
