/* ========================================================================
   SETTINGS CONTROLLER (SİSTEM AYARLARI VE ONAY MEKANİZMASI)
   Sistem genel ayarları, dönem yönetimi ve bekleyen kullanıcı onayları.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, diffEntity } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_ROLE } from '@timesheet/shared';
import { toISODateString, parseLocalDate, startOfMonth, endOfMonth, eachMonthOfInterval } from '../utils/dateUtils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound } from '../utils/AppError.js';
import { settingsRepo } from '../repositories/settingsRepo.js';

// --- PENDING USERS ---

export const getPendingUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await settingsRepo.getPendingUsers(db);

  // Return mapped with camelCase keys by default since Drizzle maps columns
  res.json({ success: true, data: { users } });
});

export const approvePendingUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

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

export const rejectPendingUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

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
        dailyAllowance: settingsRow.dailyWage,
        weeklyLimit: settingsRow.maxWeeklyDays,
        programStart: toISODateString(settingsRow.programStartDate),
        programEnd: toISODateString(settingsRow.programEndDate),
      },
    },
  });
});

export const updateSystemSettings = asyncHandler(async (req: Request, res: Response) => {
  const { dailyAllowance, weeklyLimit, programStart, programEnd } = req.body;
  const dailyAllowanceFloat = dailyAllowance !== undefined && dailyAllowance !== '' ? dailyAllowance : undefined;

  await withDrizzleTransaction(async (tx) => {
    const current = await settingsRepo.getSettings(tx);

    const formatDate = (d: any) => toISODateString(d ?? null);

    const newStart = formatDate(programStart);
    const newEnd = formatDate(programEnd);
    const oldStart = formatDate(current?.programStartDate);
    const oldEnd = formatDate(current?.programEndDate);

    const dateChanged = (newStart !== oldStart) || (newEnd !== oldEnd);

    const updatedSettings = await settingsRepo.upsertSettings(tx, {
      dailyWage: dailyAllowanceFloat,
      maxWeeklyDays: weeklyLimit,
      programStartDate: newStart!,
      programEndDate: newEnd!,
    });

    if (dateChanged) {
      if (newStart && newEnd) {
        const parsedStart = parseLocalDate(newStart);
        const parsedEnd = parseLocalDate(newEnd);

        // 1. Yeni sınırların dışındaki tüm dönemleri sil (is_deleted = true)
        await settingsRepo.deletePeriodsOutside(tx, newStart, newEnd);

        // 2. Yeni tarih aralığındaki tüm ayları hesapla
        if (parsedStart && parsedEnd) {
          const months = eachMonthOfInterval({ start: parsedStart, end: parsedEnd });

          for (const monthDate of months) {
            const y = monthDate.getFullYear();
            const m = monthDate.getMonth() + 1;

            // Ayın başlangıcı
            const periodStart = (y === parsedStart.getFullYear() && m === parsedStart.getMonth() + 1)
              ? parsedStart
              : startOfMonth(monthDate);

            // Ayın bitişi
            const periodEnd = (y === parsedEnd.getFullYear() && m === parsedEnd.getMonth() + 1)
              ? parsedEnd
              : endOfMonth(monthDate);

            // Dönemi oluştur veya varsa tarihlerini güncelle
            await settingsRepo.upsertPeriod(tx, {
              year: y,
              month: m,
              startDate: toISODateString(periodStart)!,
              endDate: toISODateString(periodEnd)!,
            });
          }
        }
      } else {
        await settingsRepo.markAllPeriodsDeleted(tx);
      }

      if (newEnd && newEnd !== oldEnd) {
        // Otomatik Süre Uzatma: Program bitiş tarihi değiştiyse, tüm sorumluların (non-admin) 
        // expiry_date bilgilerini "Bitiş + 20 gün" kuralına göre toplu olarak günceller.
        await settingsRepo.extendUsersExpiry(tx, newEnd);
      }
    }

    const changes = diffEntity(AUDIT_ENTITY_TYPE.SETTINGS, current || {}, updatedSettings);

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
  });

  res.json({ success: true, message: 'Sistem ayarları güncellendi' });
});
