/* ========================================================================
   USER CONTROLLER (KULLANICI YÖNETİMİ)
   Kullanıcı listeleme, güncelleme, silme ve profil işlemlerini yönetir.
   ======================================================================== */
import bcrypt from 'bcrypt';

import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, diffEntityWithLookups, toSnakeCaseKeys } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_STATUS, USER_ROLE } from '@timesheet/shared';
import type { UserRole, UserStatus } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound, conflict } from '../utils/AppError.js';
import { buildPagination, paginationParams } from '../utils/pagination.js';
import { ok, paginated } from '../utils/responses.js';
import * as userRepo from '../repositories/userRepo.js';
import type { DatabaseError } from 'pg';


export const getUsers = asyncHandler(async (req, res) => {
  const { role, status, unitId, locationId, search } = req.query as {
    role?: string;
    status?: string;
    unitId?: string;
    locationId?: string;
    search?: string;
  };

  const { page, limit, offset } = paginationParams(req.query as Record<string, unknown>);

  const filters = {
    ...(role !== undefined ? { role: role as UserRole } : {}),
    ...(status !== undefined ? { status: status as UserStatus } : {}),
    ...(unitId !== undefined ? { unitId } : {}),
    ...(locationId !== undefined ? { locationId } : {}),
    ...(search !== undefined ? { search } : {}),
  };

  const result = await userRepo.list(db, filters, page, limit, offset);

  const users = result.users.map((row) => ({
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    expiryDate: row.expiryDate,
    createdAt: row.createdAt,
    unit: (row.unitId != null || row.locationId != null) ? {
      id: row.unitId ?? null,
      name: row.unitName ?? null,
      location: row.locationId != null ? { id: row.locationId, name: row.locationName } : null,
    } : null,
  }));

  return paginated(res, 'users', users, buildPagination(page, limit, result.total));
});

export const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params as { userId: string };
  const { role, status, unitId, locationId, expiryDate } = req.body as {
    role?: string;
    status?: string;
    unitId?: string;
    locationId?: string;
    expiryDate?: string | null;
  };

  const result = await withDrizzleTransaction(async (tx) => {
    const existingUser = await userRepo.findById(tx, userId);
    if (!existingUser) return null;

    const newRole = role !== undefined ? role : existingUser.role;
    const newUnitId = unitId !== undefined ? unitId : existingUser.unitId;
    const newLocationId = locationId !== undefined ? locationId : existingUser.locationId;
    let newExpiryDate = expiryDate !== undefined ? expiryDate : existingUser.expiryDate;
    let newStatus = status !== undefined ? status : existingUser.status;

    if (newRole === USER_ROLE.ADMIN) newExpiryDate = null;

    // Otomatik Durum (Status) Geçişleri:
    // 1. Expiry Date geçmişse durumu EXPIRED yap.
    // 2. Durum EXPIRED ise ama yeni bir gelecek tarih seçilmişse durumu ACTIVE'e çek.
    if (newExpiryDate && new Date(newExpiryDate) < new Date()) {
      newStatus = USER_STATUS.EXPIRED;
    } else if (newStatus === USER_STATUS.EXPIRED && (!newExpiryDate || new Date(newExpiryDate) >= new Date())) {
      newStatus = USER_STATUS.ACTIVE;
    }

    const updatedUser = await userRepo.updateUser(tx, userId, {
      role: newRole,
      status: newStatus,
      unitId: newUnitId ?? null,
      locationId: newLocationId ?? null,
      expiryDate: newExpiryDate ?? null,
    });

    if (!updatedUser) return null;

    // Audit Log Lookup: UUID olan Birim/Yerleşke ID'lerini isimlere çevirerek logda okunabilir kılar.
    const idLookup: Record<string, Record<string, string>> = { unit_id: {}, location_id: {} };
    if (existingUser.unitId !== updatedUser.unitId) {
      const ids = [existingUser.unitId, updatedUser.unitId].filter((v): v is string => v != null);
      idLookup.unit_id = await userRepo.lookupUnitNames(tx, ids);
    }
    if (existingUser.locationId !== updatedUser.locationId) {
      const ids = [existingUser.locationId, updatedUser.locationId].filter((v): v is string => v != null);
      idLookup.location_id = await userRepo.lookupLocationNames(tx, ids);
    }

    const changes = diffEntityWithLookups(
      AUDIT_ENTITY_TYPE.USER,
      toSnakeCaseKeys(existingUser as unknown as Record<string, unknown>),
      toSnakeCaseKeys(updatedUser as unknown as Record<string, unknown>),
      idLookup,
    );

    await createAuditLog(tx, {
      action: AUDIT_ACTION.USER_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      summary: changes.length > 0
        ? `${existingUser.username} adlı kullanıcı güncellendi (${changes.length} alan değişti).`
        : `${existingUser.username} adlı kullanıcı güncellendi.`,
      changes,
    });

    return updatedUser;
  });

  if (!result) throw notFound('Kullanıcı bulunamadı.');

  return ok(res, {
    id: result.id,
    username: result.username,
    role: result.role,
    status: result.status,
    expiryDate: result.expiryDate,
    unitId: result.unitId,
    locationId: result.locationId,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params as { userId: string };

  const result = await withDrizzleTransaction(async (tx) => {
    const oldUser = await userRepo.findById(tx, userId);
    const deleted = await userRepo.deleteUser(tx, userId);

    if (!deleted) return null;

    await createAuditLog(tx, {
      action: AUDIT_ACTION.USER_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      summary: `${deleted.username} adlı kullanıcı silindi.`,
      metadata: oldUser ? {
        role: oldUser.role,
        status: oldUser.status,
        unitId: oldUser.unitId ?? null,
        locationId: oldUser.locationId ?? null,
      } : {},
    });

    return deleted;
  });

  if (!result) throw notFound('Silinecek kullanıcı bulunamadı.');

  return ok(res, undefined, 'Kullanıcı başarıyla silindi.');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { username, newPassword } = req.body as { username?: string; newPassword?: string };

  let updatedUser;
  try {
    updatedUser = await withDrizzleTransaction(async (tx) => {
      const currUser = await userRepo.findById(tx, userId);
      if (!currUser) throw notFound('Kullanıcı bulunamadı.');

      const oldUsername = currUser.username;
      const newPasswordHash = newPassword
        ? await bcrypt.hash(newPassword, 10)
        : currUser.passwordHash;
      const passwordChanged = !!newPassword;
      const usernameChanged = !!username && username !== currUser.username;

      const newUser = await userRepo.updateProfile(tx, userId, {
        username: username ?? null,
        passwordHash: newPasswordHash,
      });

      if (!newUser) throw notFound('Kullanıcı bulunamadı.');

      const actor = { username: oldUsername, role: req.user!.role };

      if (usernameChanged) {
        await createAuditLog(tx, {
          action: AUDIT_ACTION.USER_PROFILE_UPDATE,
          actor,
          entityType: AUDIT_ENTITY_TYPE.USER,
          entityId: userId,
          summary: `${oldUsername} kullanıcı adını "${newUser.username}" olarak değiştirdi.`,
          changes: [`Kullanıcı Adı: ${oldUsername} → ${newUser.username}`],
        });
      }

      if (passwordChanged) {
        await createAuditLog(tx, {
          action: AUDIT_ACTION.USER_PASSWORD_CHANGE,
          actor: { username: newUser.username, role: req.user!.role },
          entityType: AUDIT_ENTITY_TYPE.USER,
          entityId: userId,
          summary: `${newUser.username} kendi şifresini değiştirdi.`,
        });
      }

      return newUser;
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as DatabaseError).code === '23505') {
      throw conflict('Bu kullanıcı adı zaten kullanımda.');
    }
    throw err;
  }

  return ok(res, {
    id: updatedUser.id,
    username: updatedUser.username,
    role: updatedUser.role,
    status: updatedUser.status,
    unitId: updatedUser.unitId,
    locationId: updatedUser.locationId,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  }, 'Profil başarıyla güncellendi.');
});
