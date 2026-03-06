import { withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AUDIT_EVENT } from "../enums/auditEventTypes.js";

// ==================== OKUMA (GET) İŞLEMLERİ ====================

// Duyuruları getirir (Sayfalama ile)
export async function getAnnouncements(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await withTransaction(async (client) => {
      // Toplam kayıt sayısı
      const countResult = await client.query('SELECT COUNT(*) FROM app.announcements');
      const totalRecords = parseInt(countResult.rows[0].count);

      // Verileri çek
      const dataResult = await client.query(
        `SELECT 
          id, 
          title, 
          content,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
        FROM app.announcements
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        announcements: toCamelCase(dataResult.rows),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          limit
        }
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Duyurular alınırken hata oluştu'
    });
  }
}

// ==================== YAZMA (POST) İŞLEMLERİ ====================

// Yeni bir duyuru oluşturur
export async function createAnnouncement(req, res) {
  try {
    const { title, content } = req.body;

    // Validasyon
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Duyuru başlığı ve içeriği gereklidir.'
      });
    }

    if (title.length > 200 || content.length > 3000) {
      return res.status(400).json({
        success: false,
        message: 'Başlık en fazla 200, içerik en fazla 3000 karakter olabilir.'
      });
    }

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
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.ANNOUNCEMENT,
        description: `"${title}" başlıklı yeni duyuru oluşturuldu.`,
        tableName: 'announcements',
        recordId: newAnnouncement.id,
        newData: newAnnouncement
      });

      return newAnnouncement;
    });

    res.status(201).json({
      success: true,
      data: {
        announcement: toCamelCase(result)
      },
      message: 'Duyuru başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Duyuru oluşturulurken hata oluştu'
    });
  }
}

// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

// Mevcut bir duyuruyu günceller
export async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Duyuru başlığı ve içeriği gereklidir.'
      });
    }

    if (title.length > 200 || content.length > 3000) {
      return res.status(400).json({
        success: false,
        message: 'Başlık en fazla 200, içerik en fazla 3000 karakter olabilir.'
      });
    }

    const result = await withTransaction(async (client) => {
      // Önce veriyi kontrol et
      const oldResult = await client.query('SELECT * FROM app.announcements WHERE id = $1', [id]);
      if (oldResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      const updateResult = await client.query(
        `UPDATE app.announcements 
         SET title = $1, content = $2
         WHERE id = $3 
         RETURNING id, title, content,
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at`,
        [title, content, id]
      );

      const updatedAnnouncement = updateResult.rows[0];

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.ANNOUNCEMENT,
        description: `"${title}" başlıklı duyuru güncellendi.`,
        tableName: 'announcements',
        recordId: id,
        oldData: oldResult.rows[0],
        newData: updatedAnnouncement
      });

      return updatedAnnouncement;
    });

    res.json({
      success: true,
      data: {
        announcement: toCamelCase(result)
      },
      message: 'Duyuru başarıyla güncellendi'
    });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Duyuru bulunamadı.' });
    }
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Duyuru güncellenirken hata oluştu'
    });
  }
}

// ==================== SİLME (DELETE) İŞLEMLERİ ====================

// Bir duyuruyu siler
export async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;

    await withTransaction(async (client) => {
      const oldResult = await client.query('SELECT * FROM app.announcements WHERE id = $1', [id]);
      if (oldResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      await client.query('DELETE FROM app.announcements WHERE id = $1', [id]);

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.ANNOUNCEMENT,
        description: `"${oldResult.rows[0].title}" başlıklı duyuru silindi.`,
        tableName: 'announcements',
        recordId: id,
        oldData: oldResult.rows[0]
      });
    });

    res.json({
      success: true,
      message: 'Duyuru başarıyla silindi.'
    });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Duyuru bulunamadı.' });
    }
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Duyuru silinirken hata oluştu'
    });
  }
}
