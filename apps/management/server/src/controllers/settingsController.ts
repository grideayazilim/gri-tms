/* ========================================================================
   SETTINGS CONTROLLER (SİSTEM AYARLARI VE ONAY MEKANİZMASI)
   Sistem genel ayarları, dönem yönetimi ve bekleyen kullanıcı onayları.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, diffEntity } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_ROLE, SystemSettingsType } from '@timesheet/shared';
import { toISODateString } from '../utils/dateUtils.js';
import { regeneratePeriodsForRange } from '../utils/periodGenerator.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound, badRequest } from '../utils/AppError.js';
import { settingsRepo } from '../repositories/settingsRepo.js';

// --- PENDING USERS ---

export const getPendingUsers = asyncHandler(async (req: Request, res: Response) => {
  const rows = await settingsRepo.getPendingUsers(db);

  // Düz DB satırlarını PendingUserItem nested yapısına dönüştür
  const pendingUsers = rows.map((row) => ({
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    unit: (row.unitId || row.locationId)
      ? {
          id: row.unitId ?? null,
          name: row.unitName ?? null,
          location: row.locationId
            ? { id: row.locationId, name: row.locationName ?? '' }
            : null,
        }
      : null,
  }));

  res.json({ success: true, data: { pendingUsers } });
});

export const approvePendingUser = asyncHandler<{ id: string }>(async (req, res) => {
  const { id } = req.params;

  const updatedUser = await withDrizzleTransaction(async (tx) => {
    const user = await settingsRepo.approveUser(tx, id);

    if (user) {
      await createAuditLog(tx, {
        action: AUDIT_ACTION.USER_APPROVE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: id,
        summary: `${user.username} adlı kullanıcı onaylandı.`,
        metadata: {
          role: user.role,
          unitId: user.unitId || null,
          locationId: user.locationId || null,
        },
      });
    }
    return user;
  });

  if (!updatedUser) throw notFound('Onay bekleyen kullanıcı bulunamadı');

  res.json({ success: true, message: 'Kullanıcı onaylandı' });
});

export const rejectPendingUser = asyncHandler<{ id: string }>(async (req, res) => {
  const { id } = req.params;

  const deletedUser = await withDrizzleTransaction(async (tx) => {
    const user = await settingsRepo.rejectUser(tx, id);

    if (user) {
      await createAuditLog(tx, {
        action: AUDIT_ACTION.USER_REJECT,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: id,
        summary: `${user.username} adlı bekleyen kullanıcı reddedildi ve silindi.`,
        metadata: {
          role: user.role,
          unitId: user.unitId || null,
          locationId: user.locationId || null,
        },
      });
    }
    return user;
  });

  if (!deletedUser) throw notFound('Onay bekleyen kullanıcı bulunamadı');

  res.json({ success: true, message: 'Kullanıcı reddedildi ve silindi' });
});

// --- SYSTEM SETTINGS ---

export const getSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  const settingsRow = await settingsRepo.getSettings(db);

  if (!settingsRow) {
    res.json({ success: true, data: { settings: {} } });
    return;
  }

  res.json({
    success: true,
    data: {
      settings: {
        dailyWage: settingsRow.dailyWage,
        maxWeeklyDays: settingsRow.maxWeeklyDays,
        programStartDate: toISODateString(settingsRow.programStartDate),
        programEndDate: toISODateString(settingsRow.programEndDate),
      },
    },
  });
});

export const updateSystemSettings = asyncHandler<Record<string, string>, unknown, SystemSettingsType>(async (req, res) => {
  const { dailyWage, maxWeeklyDays, programStartDate, programEndDate } = req.body;

  const updatedSettings = await withDrizzleTransaction(async (tx) => {
    const current = await settingsRepo.getSettings(tx);

    const formatDate = (d: Date | string | null | undefined) => toISODateString(d ?? null);

    const newStart = formatDate(programStartDate);
    const newEnd = formatDate(programEndDate);
    const oldStart = formatDate(current?.programStartDate);
    const oldEnd = formatDate(current?.programEndDate);

    const dateChanged = (newStart !== oldStart) || (newEnd !== oldEnd);

    if (!newStart || !newEnd) {
      throw badRequest('Program başlangıç ve bitiş tarihleri zorunludur.');
    }

    const dailyWageStr = (dailyWage !== undefined && dailyWage !== null) ? String(dailyWage) : undefined;

    const saved = await settingsRepo.upsertSettings(tx, {
      ...(dailyWageStr ? { dailyWage: dailyWageStr } : {}),
      maxWeeklyDays: maxWeeklyDays ?? 6,
      programStartDate: newStart,
      programEndDate: newEnd,
    });

    if (dateChanged) {
      if (newStart && newEnd) {
        // Dönemleri yeni tarih aralığına göre yeniden oluştur
        await regeneratePeriodsForRange(tx, newStart, newEnd);
      } else {
        await settingsRepo.markAllPeriodsDeleted(tx);
      }

      if (newEnd && newEnd !== oldEnd) {
        // Otomatik Süre Uzatma: Program bitiş tarihi değiştiyse, tüm sorumluların (non-admin)
        // expiry_date bilgilerini "Bitiş + 20 gün" kuralına göre toplu olarak günceller.
        await settingsRepo.extendUsersExpiry(tx, newEnd);
      }
    }

    const changes = current != null
      ? diffEntity(AUDIT_ENTITY_TYPE.SETTINGS, current, saved)
      : [];

    await createAuditLog(tx, {
      action: AUDIT_ACTION.SETTINGS_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.SETTINGS,
      entityId: null, // Settings singleton'ı integer ID taşır, audit_logs UUID bekler
      summary: changes.length > 0
        ? `Sistem ayarları güncellendi (${changes.length} alan değişti).`
        : 'Sistem ayarları güncellendi.',
      changes,
      metadata: dateChanged ? { periodsRegenerated: true } : {},
    });

    return saved;
  });

  res.json({
    success: true,
    message: 'Sistem ayarları güncellendi',
    data: {
      settings: {
        dailyWage: updatedSettings.dailyWage,
        maxWeeklyDays: updatedSettings.maxWeeklyDays,
        programStartDate: toISODateString(updatedSettings.programStartDate),
        programEndDate: toISODateString(updatedSettings.programEndDate),
      },
    },
  });
});
