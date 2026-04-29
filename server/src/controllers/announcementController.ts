/* ========================================================================
   ANNOUNCEMENT CONTROLLER (DUYURU YÖNETİMİ)
   Sistem duyurularının oluşturulması, okunma takibi ve listelenmesi.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, diffEntity } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound } from '../utils/AppError.js';
import { buildPagination } from '../utils/pagination.js';
import { announcementRepo } from '../repositories/announcementRepo.js';

// ==================== OKUMA (GET) İŞLEMLERİ ====================

export const getAnnouncements = asyncHandler(async (req: Request, res: Response) => {
  const pageStr = req.query.page as string | undefined;
  const limitStr = req.query.limit as string | undefined;

  const page = parseInt(pageStr || '1', 10);
  const limit = parseInt(limitStr || '20', 10);
  const offset = (page - 1) * limit;

  // Toplam kayıt sayısını bul (Pagination için)
  const totalRecords = await announcementRepo.getCount(db);

  // Duyuru Listesi: Mevcut kullanıcının okuyup okumadığını belirler
  const announcements = await announcementRepo.listWithReadStatus(db, req.user!.id, limit, offset);

  // Tarih formatını (ISO String) JS'te yapalım, SQL tarafında to_char yapmak yerine
  const formattedAnnouncements = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    createdAt: a.createdAt.toISOString(),
    isRead: a.isRead,
  }));

  res.json({
    success: true,
    data: {
      announcements: formattedAnnouncements,
      pagination: buildPagination(page, limit, totalRecords),
    },
  });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await announcementRepo.getUnreadCount(db, req.user!.id);
  res.json({ success: true, data: { count } });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await announcementRepo.markAsRead(db, req.user!.id, id!);
  res.json({ success: true });
});

// ==================== YAZMA (POST) İŞLEMLERİ ====================

export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const { title, content } = req.body;

  const result = await withDrizzleTransaction(async (tx) => {
    const newAnnouncement = await announcementRepo.create(tx, { title, content });

    await createAuditLog(tx, {
      action: AUDIT_ACTION.ANNOUNCEMENT_CREATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.ANNOUNCEMENT,
      entityId: newAnnouncement.id,
      summary: `"${title}" başlıklı yeni duyuru oluşturuldu.`,
    });

    return newAnnouncement;
  });

  res.status(201).json({
    success: true,
    data: {
      announcement: {
        id: result.id,
        title: result.title,
        content: result.content,
        createdAt: result.createdAt.toISOString(),
      },
    },
    message: 'Duyuru başarıyla oluşturuldu',
  });
});

// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

export const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content } = req.body;

  const result = await withDrizzleTransaction(async (tx) => {
    const oldRow = await announcementRepo.findById(tx, id!);
    if (!oldRow) throw notFound('Duyuru bulunamadı.');

    const updatedAnnouncement = await announcementRepo.update(tx, id!, { title, content });

    // Değişiklik Analizi: Sadece değişen alanları Audit Log'a kaydeder
    const changes = diffEntity(AUDIT_ENTITY_TYPE.ANNOUNCEMENT, oldRow, updatedAnnouncement);

    await createAuditLog(tx, {
      action: AUDIT_ACTION.ANNOUNCEMENT_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.ANNOUNCEMENT,
      entityId: id!,
      summary: changes.length > 0
        ? `"${title}" başlıklı duyuru güncellendi (${changes.length} alan değişti).`
        : `"${title}" başlıklı duyuru güncellendi.`,
      changes,
    });

    return updatedAnnouncement;
  });

  res.json({
    success: true,
    data: {
      announcement: {
        id: result.id,
        title: result.title,
        content: result.content,
        createdAt: result.createdAt.toISOString(),
      },
    },
    message: 'Duyuru başarıyla güncellendi',
  });
});

// ==================== SİLME (DELETE) İŞLEMLERİ ====================

export const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await withDrizzleTransaction(async (tx) => {
    const oldRow = await announcementRepo.findById(tx, id!);
    if (!oldRow) throw notFound('Duyuru bulunamadı.');

    await announcementRepo.delete(tx, id!);

    const title = oldRow.title;
    await createAuditLog(tx, {
      action: AUDIT_ACTION.ANNOUNCEMENT_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.ANNOUNCEMENT,
      entityId: id!,
      summary: `"${title}" başlıklı duyuru silindi.`,
    });
  });

  res.json({ success: true, message: 'Duyuru başarıyla silindi.' });
});
