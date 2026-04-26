/* ========================================================================
   AUDIT LOG CONTROLLER (DENETİM KAYITLARI KONTROLCÜSÜ)
   Sistemde yapılan tüm işlemlerin geçmişini filtreleyerek listeler.
   ======================================================================== */
import { pool } from '../config/database.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { buildPagination } from '../utils/pagination.js';
import { AUDIT_ACTION_META } from '@timesheet/shared';


function buildAuditLogFilters({ actor, action, category, entityType, startDate, endDate }) {
  let where = 'WHERE 1=1';
  const params = [];
  let i = 1;

  // Aktör Filtresi: İşlemi yapan kişinin kullanıcı adına göre arama
  if (actor) {
    where += ` AND actor_username ILIKE $${i++}`;
    params.push(`%${actor}%`);
  }
  // Aksiyon Filtresi: Belirli bir aksiyon kodu (örn: USER_LOGIN)
  if (action) {
    where += ` AND action = $${i++}`;
    params.push(action);
  }
  // Kategori Filtresi: Bir kategoriye ait tüm aksiyonları toplu filtreler (örn: Tüm TIMESHEET aksiyonları)
  if (category) {
    const actionsInCategory = Object.entries(AUDIT_ACTION_META)
      .filter(([, meta]) => meta.category === category)
      .map(([code]) => code);
    if (actionsInCategory.length > 0) {
      where += ` AND action = ANY($${i++})`;
      params.push(actionsInCategory);
    } else {
      where += ` AND 1=0`; // Kategori bulunamazsa sonuç dönmemesini sağlayan dummy koşul
    }
  }
  // Varlık Tipi Filtresi: İşlem yapılan nesnenin tipi (örn: EMPLOYEE)
  if (entityType) {
    where += ` AND entity_type = $${i++}`;
    params.push(entityType);
  }
  // Tarih Aralığı Filtresi: Başlangıç ve bitiş tarihlerine göre saat dilimi ekleyerek filtreler
  if (startDate) {
    where += ` AND created_at >= $${i++}::timestamp`;
    params.push(`${startDate} 00:00:00`);
  }
  if (endDate) {
    where += ` AND created_at <= $${i++}::timestamp`;
    params.push(`${endDate} 23:59:59`);
  }

  return { where, params, nextParamIndex: i };
}


export const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    actor,
    action,
    category,
    entityType,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const { where, params, nextParamIndex } = buildAuditLogFilters({
    actor, action, category, entityType, startDate, endDate,
  });

  // Paralel Sorgu: Performans için log listesini ve toplam sayıyı aynı anda çeker
  const [logsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, action, actor_username, actor_role, entity_type, entity_id,
              summary, changes, metadata, created_at
       FROM app.audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}`,
      [...params, limit, (page - 1) * limit],
    ),
    pool.query(
      `SELECT COUNT(*) FROM app.audit_logs ${where}`,
      params,
    ),
  ]);


  const auditLogs = logsResult.rows.map((row) => ({
    id: row.id,
    action: row.action,
    actor: {
      username: row.actor_username,
      role: row.actor_role,
    },
    entityType: row.entity_type,
    entityId: row.entity_id,
    summary: row.summary,
    changes: Array.isArray(row.changes) ? row.changes : [],
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    createdAt: row.created_at,
  }));

  res.json({
    success: true,
    data: {
      auditLogs,
      pagination: buildPagination(page, limit, parseInt(countResult.rows[0].count)),
    },
  });
});
