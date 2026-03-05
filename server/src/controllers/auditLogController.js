import { withTransaction } from '../config/database.js';
import { toCamelCase } from '../utils/caseMapper.js';

/**
 * GET /audit-logs
 * Audit log kayıtlarını filtreli olarak getirir
 * 
 * Query params:
 * - username: Kullanıcı adına göre filtre
 * - eventType: Event type'a göre filtre (LOGIN, USER, EMPLOYEE, vb.)
 * - tableName: Tablo adına göre filtre
 * - startDate: Başlangıç tarihi (YYYY-MM-DD)
 * - endDate: Bitiş tarihi (YYYY-MM-DD)
 * - page: Sayfa numarası (default: 1)
 * - limit: Sayfa başına kayıt (default: 50)
 */
export async function getAuditLogs(req, res) {
  try {
    const {
      username,
      eventType,
      tableName,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Query builder
    let query = 'SELECT * FROM app.audit_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Filtreler
    if (username) {
      query += ` AND username = $${paramIndex}`;
      params.push(username);
      paramIndex++;
    }

    if (eventType) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (tableName) {
      query += ` AND table_name = $${paramIndex}`;
      params.push(tableName);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Sıralama ve sayfalama
    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    // Count query
    let countQuery = 'SELECT COUNT(*) FROM app.audit_logs WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (username) {
      countQuery += ` AND username = $${countParamIndex}`;
      countParams.push(username);
      countParamIndex++;
    }

    if (eventType) {
      countQuery += ` AND event_type = $${countParamIndex}`;
      countParams.push(eventType);
      countParamIndex++;
    }

    if (tableName) {
      countQuery += ` AND table_name = $${countParamIndex}`;
      countParams.push(tableName);
      countParamIndex++;
    }

    if (startDate) {
      countQuery += ` AND created_at >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      countQuery += ` AND created_at <= $${countParamIndex}`;
      countParams.push(endDate);
      countParamIndex++;
    }

    // Execute queries
    const result = await withTransaction(async (client) => {
      const logsResult = await client.query(query, params);
      const countResult = await client.query(countQuery, countParams);

      return {
        logs: logsResult.rows,
        total: parseInt(countResult.rows[0].count)
      };
    });

    res.json({
      success: true,
      data: {
        auditLogs: toCamelCase(result.logs),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Audit log kayıtları alınırken hata oluştu'
    });
  }
}

