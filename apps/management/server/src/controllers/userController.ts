/* ========================================================================
   USER CONTROLLER (KULLANICI YÖNETİMİ)
   Kullanıcı listeleme, güncelleme, silme ve profil işlemlerini yönetir.
   ======================================================================== */
import bcrypt from 'bcrypt';

import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, diffEntityWithLookups } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_STATUS, USER_ROLE, UserEditType } from '@timesheet/shared';
import type { UserRole, UserStatus, ProfileUpdateType, UserListQuery } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound, badRequest, forbidden, rethrowIfNotUniqueViolation } from '../utils/AppError.js';
import { buildPagination, paginationParams } from '../utils/pagination.js';
import { ok, paginated } from '../utils/responses.js';
import * as userRepo from '../repositories/userRepo.js';
import type { DbExecutor } from '../types/db.js';


export const getUsers = asyncHandler<Record<string, string>, unknown, unknown, UserListQuery>(async (req, res) => {
  const { role, status, unitId, locationId, search } = req.query;

  const { page, limit, offset } = paginationParams(req.query);

  const filters = {
    ...(role !== undefined ? { role } : {}),
    ...(status !== undefined ? { status } : {}),
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

/* Sistemde en az bir aktif admin kalmasını garanti eder. Son admin giderse
   yeni kayıtlar sonsuza kadar PENDING'de bekler, kurtarma yolu elle SQL. */
async function assertNotLastAdmin(tx: DbExecutor, targetUserId: string): Promise<void> {
  const target = await userRepo.findById(tx, targetUserId);
  if (!target) return;
  if (target.role !== USER_ROLE.ADMIN || target.status !== USER_STATUS.ACTIVE) return;

  const others = await userRepo.countOtherActiveAdmins(tx, targetUserId);
  if (others === 0) {
    throw badRequest(
      'Sistemdeki son aktif yönetici. Silinemez veya yetkisi düşürülemez — '
      + 'önce başka bir yönetici hesabı oluşturup aktifleştirin.',
    );
  }
}

export const updateUser = asyncHandler<{ userId: string }, unknown, UserEditType>(async (req, res) => {
  const { userId } = req.params;
  const { role, status, unitId, locationId, expiryDate, forceNewPassword } = req.body;

  /* bcrypt pahalı bir CPU işi; transaction içinde çalıştırıldığında
     havuz bağlantısını ~100 ms boyunca gereksiz yere tutuyordu. */
  const forcedPasswordHash = forceNewPassword
    ? await bcrypt.hash(forceNewPassword, 10)
    : undefined;

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

    // Admin şifre sıfırlama: forceNewPassword varsa sadece ADMIN yapabilir
    let passwordHash: string | undefined;
    if (forceNewPassword) {
      if (!req.user || req.user.role !== USER_ROLE.ADMIN) {
        throw forbidden('Başka bir kullanıcının şifresini değiştirmek için admin yetkisi gereklidir.');
      }
      passwordHash = forcedPasswordHash;
    }

    /* Son aktif admin'in yetkisi düşürülüyor veya pasife alınıyorsa engelle. */
    const demotingAdmin = newRole !== USER_ROLE.ADMIN || newStatus !== USER_STATUS.ACTIVE;
    if (demotingAdmin) {
      await assertNotLastAdmin(tx, userId);
    }

    /* Rol, durum veya şifre değiştiyse mevcut token'lar geçersizleşsin.
       Aksi halde yetkisi düşürülen kullanıcı 7 gün eski yetkileriyle çalışır. */
    const bumpTokenVersion = Boolean(passwordHash)
      || newRole !== existingUser.role
      || newStatus !== existingUser.status
      || (newUnitId ?? null) !== existingUser.unitId
      || (newLocationId ?? null) !== existingUser.locationId;

    const updatedUser = await userRepo.updateUser(tx, userId, {
      role: newRole,
      status: newStatus,
      unitId: newUnitId ?? null,
      locationId: newLocationId ?? null,
      expiryDate: newExpiryDate ?? null,
      ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}),
    }, bumpTokenVersion);

    if (!updatedUser) return null;

    // Audit Log Lookup: UUID olan Birim/Yerleşke ID'lerini isimlere çevirerek logda okunabilir kılar.
    const idLookup: Record<string, Record<string, string>> = { unitId: {}, locationId: {} };
    if (existingUser.unitId !== updatedUser.unitId) {
      const ids = [existingUser.unitId, updatedUser.unitId].filter((v): v is string => v != null);
      idLookup.unitId = await userRepo.lookupUnitNames(tx, ids);
    }
    if (existingUser.locationId !== updatedUser.locationId) {
      const ids = [existingUser.locationId, updatedUser.locationId].filter((v): v is string => v != null);
      idLookup.locationId = await userRepo.lookupLocationNames(tx, ids);
    }

    const changes = diffEntityWithLookups(
      AUDIT_ENTITY_TYPE.USER,
      existingUser,
      updatedUser,
      idLookup,
    );

    if (!forceNewPassword) {
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
    }

    // Admin şifre sıfırlama audit logu
    if (forceNewPassword) {
      await createAuditLog(tx, {
        action: AUDIT_ACTION.USER_PASSWORD_CHANGE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: userId,
        summary: `Admin ${req.user?.username}, ${existingUser.username} kullanıcısının şifresini sıfırladı.`,
        changes: ['Şifre güncellendi'],
      });
    }

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

export const deleteUser = asyncHandler<{ userId: string }>(async (req, res) => {
  const { userId } = req.params;

  /* Kendi hesabını silme, son admin korumasından önce engellenir: birden fazla
     admin varken o koruma devreye girmez ve oturum bir sonraki istekte sessizce
     kopardı. */
  if (userId === req.user!.id) {
    throw badRequest('Kendi hesabınızı silemezsiniz. Bu işlemi başka bir yönetici yapmalıdır.');
  }

  const result = await withDrizzleTransaction(async (tx) => {
    // Son aktif admin silinemez
    await assertNotLastAdmin(tx, userId);

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

export const updateProfile = asyncHandler<Record<string, string>, unknown, ProfileUpdateType>(async (req, res) => {
  const user = req.user;
  if (!user) throw forbidden('Yetkisiz erişim');
  const userId = user.id;
  const { username, newPassword, oldPassword } = req.body;

  /* Pahalı CPU işleri (bcrypt.compare + bcrypt.hash) transaction DIŞINDA yapılır;
     transaction içinde havuz bağlantısını ~200 ms boyunca meşgul ederlerdi. */
  const currentUser = await userRepo.findById(db, userId);
  if (!currentUser) throw notFound('Kullanıcı bulunamadı.');

  if (newPassword) {
    if (!oldPassword) throw badRequest('Mevcut şifrenizi giriniz.');
    const isMatch = await bcrypt.compare(oldPassword, currentUser.passwordHash);
    if (!isMatch) throw badRequest('Mevcut şifre yanlış.');
  }

  const precomputedHash = newPassword
    ? await bcrypt.hash(newPassword, 10)
    : currentUser.passwordHash;

  let updatedUser;
  try {
    updatedUser = await withDrizzleTransaction(async (tx) => {
      const currUser = await userRepo.findById(tx, userId);
      if (!currUser) throw notFound('Kullanıcı bulunamadı.');

      const oldUsername = currUser.username;
      const newPasswordHash = precomputedHash;
      const passwordChanged = !!newPassword;
      const usernameChanged = !!username && username !== currUser.username;

      const newUser = await userRepo.updateProfile(tx, userId, {
        username: username ?? null,
        passwordHash: newPasswordHash,
        passwordChanged,
      });

      if (!newUser) throw notFound('Kullanıcı bulunamadı.');

      const actor = { username: oldUsername, role: user.role };

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
          actor: { username: newUser.username, role: user.role },
          entityType: AUDIT_ENTITY_TYPE.USER,
          entityId: userId,
          summary: `${newUser.username} kendi şifresini değiştirdi.`,
        });
      }

      return newUser;
    });
  } catch (err: unknown) {
    rethrowIfNotUniqueViolation(err, 'Bu kullanıcı adı zaten kullanımda.');
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
