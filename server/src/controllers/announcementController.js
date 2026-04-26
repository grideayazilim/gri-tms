/* ========================================================================
   ANNOUNCEMENT CONTROLLER (DUYURU YÖNETİMİ)
   Sistem duyurularının oluşturulması, okunma takibi ve listelenmesi.
   ======================================================================== */
import { withTransaction, pool } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog, buildActor, diffEntity } from "../utils/auditLogger.js";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "@timesheet/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { notFound } from "../utils/AppError.js";
import { buildPagination } from "../utils/pagination.js";


// ==================== OKUMA (GET) İŞLEMLERİ ====================

export const getAnnouncements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Toplam kayıt sayısını bul (Pagination için)
  const countResult = await pool.query('SELECT COUNT(*) FROM app.announcements');
  const totalRecords = parseInt(countResult.rows[0].count);

  // Duyuru Listesi: Mevcut kullanıcının okuyup okumadığını (is_read) LEFT JOIN ile belirler
  const dataResult = await pool.query(
    `SELECT
      a.id, a.title, a.content,
      to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      CASE WHEN r.announcement_id IS NOT NULL THEN true ELSE false END AS is_read
     FROM app.announcements a
     LEFT JOIN app.announcement_reads r ON r.announcement_id = a.id AND r.user_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );


  res.json({
    success: true,
    data: {
      announcements: toCamelCase(dataResult.rows),
      pagination: buildPagination(page, limit, totalRecords),
    }
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  // Okunmamış Sayısı: announcement_reads tablosunda bu kullanıcı için kaydı olmayan duyuruları sayar
  const result = await pool.query(
    `SELECT COUNT(*) FROM app.announcements a
     WHERE NOT EXISTS (
       SELECT 1 FROM app.announcement_reads r
       WHERE r.announcement_id = a.id AND r.user_id = $1
     )`,
    [req.user.id]
  );


  res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Okundu Olarak İşaretle: ON CONFLICT DO NOTHING ile mükerrer kayıt hatasını engeller
  await pool.query(
    `INSERT INTO app.announcement_reads (user_id, announcement_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [req.user.id, id]
  );


  res.json({ success: true });
});

// ==================== YAZMA (POST) İŞLEMLERİ ====================

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content } = req.body;


  const result = await withTransaction(async (client) => {
    const insertResult = await client.query(
      `INSERT INTO app.announcements (title, content)
       VALUES ($1, $2)
       RETURNING id, title, content,
       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at`,
      [title, content]
    );

    const newAnnouncement = insertResult.rows[0];

    await createAuditLog(client, {
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
    data: { announcement: toCamelCase(result) },
    message: 'Duyuru başarıyla oluşturuldu'
  });
});

// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;


  const result = await withTransaction(async (client) => {
    const oldResult = await client.query('SELECT * FROM app.announcements WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) throw notFound('Duyuru bulunamadı.');

    const updateResult = await client.query(
      `UPDATE app.announcements
       SET title = $1, content = $2
       WHERE id = $3
       RETURNING id, title, content,
       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at`,
      [title, content, id]
    );

    const updatedAnnouncement = updateResult.rows[0];

    const oldRow = oldResult.rows[0];
    // Değişiklik Analizi: Sadece değişen alanları Audit Log'a kaydeder
    const changes = diffEntity(AUDIT_ENTITY_TYPE.ANNOUNCEMENT, oldRow, updatedAnnouncement);

    await createAuditLog(client, {
      action: AUDIT_ACTION.ANNOUNCEMENT_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.ANNOUNCEMENT,
      entityId: id,
      summary: changes.length > 0
        ? `"${title}" başlıklı duyuru güncellendi (${changes.length} alan değişti).`
        : `"${title}" başlıklı duyuru güncellendi.`,
      changes,
    });


    return updatedAnnouncement;
  });

  res.json({
    success: true,
    data: { announcement: toCamelCase(result) },
    message: 'Duyuru başarıyla güncellendi'
  });
});

// ==================== SİLME (DELETE) İŞLEMLERİ ====================

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await withTransaction(async (client) => {
    const oldResult = await client.query('SELECT * FROM app.announcements WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) throw notFound('Duyuru bulunamadı.');

    await client.query('DELETE FROM app.announcements WHERE id = $1', [id]);

    const title = oldResult.rows[0].title;
    await createAuditLog(client, {
      action: AUDIT_ACTION.ANNOUNCEMENT_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.ANNOUNCEMENT,
      entityId: id,
      summary: `"${title}" başlıklı duyuru silindi.`,
    });
  });

  res.json({ success: true, message: 'Duyuru başarıyla silindi.' });
});
