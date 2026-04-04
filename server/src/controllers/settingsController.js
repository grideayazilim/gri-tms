import { withTransaction } from '../config/database.js';
import { toCamelCase } from '../utils/caseMapper.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { AUDIT_EVENT } from '../enums/auditEventTypes.js';

// --- PENDING USERS ---

export async function getPendingUsers(req, res) {
  try {
    const result = await withTransaction(async (client) => {
      // Assuming you want to get users with status = 'PENDING'
      return await client.query(`
        SELECT u.id, u.username, u.role, u.status, u.created_at, u.last_login_at,
               l.name as location_name, un.name as unit_name
        FROM app.users u
        LEFT JOIN app.locations l ON u.location_id = l.id
        LEFT JOIN app.units un ON u.unit_id = un.id
        WHERE u.status = 'PENDING'
        ORDER BY u.created_at DESC
      `);
    });

    res.json({
      success: true,
      data: {
        users: result.rows.map(toCamelCase)
      }
    });

  } catch (error) {
    console.error('getPendingUsers error:', error);
    res.status(500).json({ success: false, message: 'Onay bekleyen kullanıcılar alınırken hata oluştu' });
  }
}

export async function approvePendingUser(req, res) {
  try {
    const { id } = req.params;
    
    const result = await withTransaction(async (client) => {
      const updateRes = await client.query(`
        UPDATE app.users
        SET status = 'ACTIVE', updated_at = NOW()
        WHERE id = $1 AND status = 'PENDING'
        RETURNING *
      `, [id]);

      if (updateRes.rowCount > 0) {
        await createAuditLog(client, {
          username: req.user?.username || 'System',
          userRole: req.user?.role || 'SYSTEM',
          eventType: AUDIT_EVENT.USER,
          description: `Kullanıcı onaylandı: ${updateRes.rows[0].username}`,
          tableName: 'users',
          recordId: id,
          newData: updateRes.rows[0]
        });
      }
      return updateRes;
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Onay bekleyen kullanıcı bulunamadı' });
    }

    res.json({ success: true, message: 'Kullanıcı onaylandı' });

  } catch (error) {
    console.error('approvePendingUser error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı onaylanırken hata oluştu' });
  }
}

export async function rejectPendingUser(req, res) {
  try {
    const { id } = req.params;
    
    const result = await withTransaction(async (client) => {
      const deleteRes = await client.query(`
        DELETE FROM app.users
        WHERE id = $1 AND status = 'PENDING'
        RETURNING *
      `, [id]);

      if (deleteRes.rowCount > 0) {
        await createAuditLog(client, {
          username: req.user?.username || 'System',
          userRole: req.user?.role || 'SYSTEM',
          eventType: AUDIT_EVENT.USER,
          description: `Kullanıcı reddedildi ve silindi: ${deleteRes.rows[0].username}`,
          tableName: 'users',
          recordId: id,
          oldData: deleteRes.rows[0]
        });
      }
      return deleteRes;
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Onay bekleyen kullanıcı bulunamadı' });
    }

    res.json({ success: true, message: 'Kullanıcı reddedildi ve silindi' });

  } catch (error) {
    console.error('rejectPendingUser error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı reddedilirken hata oluştu' });
  }
}

// --- SYSTEM SETTINGS ---

export async function getSystemSettings(req, res) {
  try {
    const result = await withTransaction(async (client) => {
      return await client.query(`SELECT * FROM app.settings LIMIT 1`);
    });

    const settings = result.rows[0];
    if (!settings) {
      return res.json({ success: true, data: { settings: {} } });
    }

    res.json({
      success: true,
      data: {
        settings: toCamelCase({
          daily_allowance: settings.daily_wage,
          weekly_limit: settings.max_weekly_days,
          program_start: settings.program_start_date ? new Date(settings.program_start_date).toLocaleDateString("en-CA") : null,
          program_end: settings.program_end_date ? new Date(settings.program_end_date).toLocaleDateString("en-CA") : null
        })
      }
    });

  } catch (error) {
    console.error('getSystemSettings error:', error);
    res.status(500).json({ success: false, message: 'Sistem ayarları alınırken hata oluştu' });
  }
}

export async function updateSystemSettings(req, res) {
  try {
    const { dailyAllowance, weeklyLimit, programStart, programEnd, force } = req.body;
    const dailyAllowanceFloat = dailyAllowance !== undefined && dailyAllowance !== '' ? parseFloat(dailyAllowance) : null;

    await withTransaction(async (client) => {
      const currentRes = await client.query(`SELECT * FROM app.settings LIMIT 1`);
      const current = currentRes.rows[0];

      const formatToDateStr = (d) => {
        if (!d) return null;
        const dt = new Date(d);
        if (isNaN(dt)) return null;
        return dt.toLocaleDateString('en-CA');
      };

      const newStart = formatToDateStr(programStart);
      const newEnd = formatToDateStr(programEnd);
      
      const oldStart = current ? formatToDateStr(current.program_start_date) : null;
      const oldEnd = current ? formatToDateStr(current.program_end_date) : null;

      const dateChanged = (newStart !== oldStart) || (newEnd !== oldEnd);

      if (dateChanged && !force) {
        const err = new Error('Tarih değişimi algılandı. Onay gerekiyor.');
        err.code = 'CONFIRM_PERIOD_CHANGE';
        throw err;
      }

      let updatedSettings;

      if (current) {
        const updateRes = await client.query(`
          UPDATE app.settings
          SET daily_wage = $1, max_weekly_days = $2, program_start_date = $3, program_end_date = $4, updated_at = NOW()
          WHERE id = $5
          RETURNING *
        `, [dailyAllowanceFloat, weeklyLimit, newStart, newEnd, current.id]);
        updatedSettings = updateRes.rows[0];
      } else {
        const insertRes = await client.query(`
          INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
          VALUES (1, $1, $2, $3, $4)
          RETURNING *
        `, [dailyAllowanceFloat, weeklyLimit, newStart, newEnd]);
        updatedSettings = insertRes.rows[0];
      }

      // SIKINTI!!!
      if (dateChanged && force) {
        await client.query(`DELETE FROM app.periods`); 
        
        if (newStart && newEnd) {
           let curr = new Date(newStart);
           const end = new Date(newEnd);
           while(curr <= end) {
              const y = curr.getFullYear();
              const m = curr.getMonth() + 1;
              const firstDay = new Date(y, m - 1, 1);
              const lastDay = new Date(y, m, 0);
              
              const periodStart = (curr.getTime() === new Date(newStart).getTime()) ? new Date(newStart) : firstDay;
              
              const isLastMonth = (y === end.getFullYear() && m === (end.getMonth() + 1));
              const periodEnd = isLastMonth ? new Date(newEnd) : lastDay;

              await client.query(`
                INSERT INTO app.periods (year, month, start_date, end_date)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (year, month) DO NOTHING
              `, [y, m, periodStart, periodEnd]);
              
              curr.setMonth(curr.getMonth() + 1);
              curr.setDate(1);
           }
        }
      }

      await createAuditLog(client, {
        username: req.user?.username || 'System',
        userRole: req.user?.role || 'SYSTEM',
        eventType: AUDIT_EVENT.SETTINGS,
        description: `Sistem ayarları güncellendi.`,
        tableName: 'settings',
        oldData: current,
        newData: updatedSettings
      });
    });

    res.json({ success: true, message: 'Sistem ayarları güncellendi' });

  } catch (error) {
    if (error.code === 'CONFIRM_PERIOD_CHANGE') {
      return res.status(409).json({ success: false, code: 'CONFIRM_PERIOD_CHANGE', message: error.message });
    }
    console.error('updateSystemSettings error:', error);
    res.status(500).json({ success: false, message: 'Sistem ayarları güncellenirken hata oluştu' });
  }
}

