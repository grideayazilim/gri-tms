import { withTransaction } from '../config/database.js';

/**
 * İşlem kaydı oluşturma
 * 
 * KULLANIM:
 * 
 * 1. Import et:
 *    import { createAuditLog } from '../utils/auditLogger.js';
 *    import { AUDIT_EVENT } from '../enums/auditEventTypes.js';
 * 
 * 2. Transaction içinde kullan:
 *    await withTransaction(async (client) => {
 *      // İşlemi yap
 *      const result = await client.query(...);
 *      
 *      // Audit log kaydet
 *      await createAuditLog(client, {
 *        username: req.user.username,
 *        userRole: req.user.role,
 *        eventType: AUDIT_EVENT.EMPLOYEE,
 *        description: "Mehmet Demir adlı çalışan oluşturuldu",
 *        tableName: "employees",
 *        recordId: result.rows[0].id,
 *        newData: { firstName: "Mehmet", lastName: "Demir" }
 *      });
 *    });
 * 
 * PARAMETRELER:
 * - username (required): İşlemi yapan kullanıcı adı
 * - userRole (optional): Kullanıcı rolü (ADMIN, RESPONSIBLE)
 * - eventType (required): AUDIT_EVENT enum'dan (LOGIN, USER, EMPLOYEE, vb.)
 * - description (required): İnsan okunabilir açıklama
 * - tableName (optional): İşlem yapılan tablo adı
 * - recordId (optional): İşlem yapılan kayıt ID'si
 * - oldData (optional): Eski veri (UPDATE/DELETE için)
 * - newData (optional): Yeni veri (CREATE/UPDATE için)
 */
export async function createAuditLog(client, {
  username,
  userRole = null,
  eventType,
  description,
  tableName = null,
  recordId = null,
  oldData = null,
  newData = null
}) {
  try {
    await client.query(
      `INSERT INTO app.audit_logs 
       (username, user_role, event_type, description, table_name, record_id, old_data, new_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        username,
        userRole,
        eventType,
        description,
        tableName,
        recordId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null
      ]
    );
  } catch (error) {
    // Audit log hatası ana işlemi durdurmamalı
    // Sadece loglayıp devam et
    console.error('❌ Audit log creation failed:', error);
  }
}

