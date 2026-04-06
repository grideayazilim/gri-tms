import { withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AUDIT_EVENT } from "../enums/auditEventTypes.js";

/*export async function fonksiyonAdi(req, res) {
  try {
    // 1. Request'ten gelen verileri al (body, params, query)
    // 2. Validasyonları yap
    // 3. SQL sorgusu çalıştır (withTransaction kullanarak)
    // 4. Başarılı response dön
  } catch (error) {
    // 5. Hata durumunda error response dön
    console.error('...', error);
    res.status(500).json({ success: false, message: '...' });
  }
}*/

//GET /employees — Çalışanları Listele
export async function getEmployees(req, res) {
  try {
    // 1) Query parametrelerini al
    const {
      unitId,
      locationId,
      search,
      status,
      page = 1,
      limit = 50,
    } = req.query;
    const offset = (page - 1) * limit;

    // 2) Dinamik WHERE koşullarını oluştur
    const conditions = []; // SQL koşulları
    const params = []; // Parametre değerleri

    if (unitId) {
      params.push(unitId);
      conditions.push(`e.unit_id = $${params.length}`);
    }

    if (locationId) {
      params.push(locationId);
      conditions.push(`u.location_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        e.first_name ILIKE $${params.length} OR 
        e.last_name ILIKE $${params.length} OR 
        e.tc_no ILIKE $${params.length}
      )`);
    }

    if (status) {
      if (status === "active") {
        conditions.push(`(e.end_date IS NULL OR e.end_date >= CURRENT_DATE)`);
      } else if (status === "inactive") {
        conditions.push(
          `(e.end_date IS NOT NULL AND e.end_date < CURRENT_DATE)`,
        );
      }
    }

    // WHERE cümlesini birleştir
    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // 3) Veritabanı sorgusunu çalıştır
    const result = await withTransaction(async (client) => {
      // Toplam kayıt sayısını al (sayfalama için)
      const countQuery = `
        SELECT COUNT(*) 
        FROM app.employees e
        JOIN app.units u ON e.unit_id = u.id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].count);

      // Asıl veriyi çek
      const dataQuery = `
        SELECT 
          e.id, e.tc_no, e.first_name, e.last_name, e.iban_no,
          e.start_date, e.end_date, e.created_at, e.updated_at,
          CASE WHEN e.end_date IS NULL OR e.end_date >= CURRENT_DATE THEN true ELSE false END AS is_active,
          u.id AS unit_id, u.name AS unit_name,
          l.id AS location_id, l.name AS location_name
        FROM app.employees e
        JOIN app.units u ON e.unit_id = u.id
        JOIN app.locations l ON u.location_id = l.id
        ${whereClause}
        ORDER BY e.last_name, e.first_name
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      const dataResult = await client.query(dataQuery, [
        ...params,
        limit,
        offset,
      ]);

      return { rows: dataResult.rows, totalRecords };
    });

    // 4) Response'u API contract'a uygun şekilde formatla
    const employees = result.rows.map((row) => ({
      id: row.id,
      tcNo: row.tc_no,
      firstName: row.first_name,
      lastName: row.last_name,
      ibanNo: row.iban_no,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      unit: {
        id: row.unit_id,
        name: row.unit_name,
        location: {
          id: row.location_id,
          name: row.location_name,
        },
      },
    }));

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(result.totalRecords / limit),
          totalRecords: result.totalRecords,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get employees error:", error);
    res
      .status(500)
      .json({ success: false, message: "Çalışanlar alınırken hata oluştu" });
  }
}

// POST /employees — Yeni Çalışan Ekle
export async function createEmployee(req, res) {
  try {
    const { tcNo, firstName, lastName, ibanNo, unitId, startDate, endDate } =
      req.body;

    if (!tcNo || !firstName || !lastName || !unitId || !startDate) {
      return res.status(400).json({
        success: false,
        message: "TC No, Ad, Soyad, Birim ve İşe Giriş tarihi zorunludur",
      });
    }

    const result = await withTransaction(async (client) => {
      const query = `
        INSERT INTO app.employees (tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date, created_at, updated_at
      `;
      const { rows } = await client.query(query, [
        tcNo,
        firstName,
        lastName,
        ibanNo || null,
        unitId,
        startDate,
        endDate || null,
      ]);

      // Birimi ve yerleşkeyi de getir
      const unitQuery = `
        SELECT u.id, u.name, l.id AS location_id, l.name AS location_name
        FROM app.units u
        JOIN app.locations l ON u.location_id = l.id
        WHERE u.id = $1
      `;
      const unitResult = await client.query(unitQuery, [unitId]);

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.EMPLOYEE,
        description: `${rows[0].first_name} ${rows[0].last_name} isimli yeni çalışan (TC: ${rows[0].tc_no}) eklendi.`,
        tableName: 'employees',
        recordId: rows[0].id,
        newData: rows[0]
      });

      return { employee: rows[0], unit: unitResult.rows[0] };
    });

    const row = result.employee;
    const unit = result.unit;

    res.status(201).json({
      success: true,
      data: {
        employee: {
          id: row.id,
          tcNo: row.tc_no,
          firstName: row.first_name,
          lastName: row.last_name,
          ibanNo: row.iban_no,
          startDate: row.start_date,
          endDate: row.end_date,
          isActive: !row.end_date || new Date(row.end_date) >= new Date(),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          unit: {
            id: unit.id,
            name: unit.name,
            location: { id: unit.location_id, name: unit.location_name },
          },
        },
      },
    });
  } catch (error) {
    console.error("Create employee error:", error);
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Bu TC No zaten kayıtlı" });
    }
    res
      .status(500)
      .json({ success: false, message: "Çalışan eklenirken hata oluştu" });
  }
}

// PUT /employees/:id — Çalışan Güncelle
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const { tcNo, firstName, lastName, ibanNo, unitId, startDate, endDate } =
      req.body;

    const result = await withTransaction(async (client) => {
      const oldRes = await client.query('SELECT * FROM app.employees WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return null;
      const oldData = oldRes.rows[0];

      const query = `
        UPDATE app.employees
        SET
          tc_no      = COALESCE($1, tc_no),
          first_name = COALESCE($2, first_name),
          last_name  = COALESCE($3, last_name),
          iban_no    = COALESCE($4, iban_no),
          unit_id    = COALESCE($5, unit_id),
          start_date = COALESCE($6, start_date),
          end_date   = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING id, tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date, created_at, updated_at
      `;
      const { rows } = await client.query(query, [
        tcNo || null,
        firstName || null,
        lastName || null,
        ibanNo !== undefined ? ibanNo : null,
        unitId || null,
        startDate || null,
        endDate || null,
        id,
      ]);

      if (rows.length === 0) return null;

      const unitQuery = `
        SELECT u.id, u.name, l.id AS location_id, l.name AS location_name
        FROM app.units u
        JOIN app.locations l ON u.location_id = l.id
        WHERE u.id = $1
      `;
      const unitResult = await client.query(unitQuery, [rows[0].unit_id]);

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.EMPLOYEE,
        description: `${rows[0].first_name} ${rows[0].last_name} isimli çalışanın (TC: ${rows[0].tc_no}) bilgileri güncellendi.`,
        tableName: 'employees',
        recordId: id,
        oldData: oldData,
        newData: rows[0]
      });

      return { employee: rows[0], unit: unitResult.rows[0] };
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Çalışan bulunamadı" });
    }

    const row = result.employee;
    const unit = result.unit;

    res.json({
      success: true,
      data: {
        employee: {
          id: row.id,
          tcNo: row.tc_no,
          firstName: row.first_name,
          lastName: row.last_name,
          ibanNo: row.iban_no,
          startDate: row.start_date,
          endDate: row.end_date,
          isActive: !row.end_date || new Date(row.end_date) >= new Date(),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          unit: {
            id: unit.id,
            name: unit.name,
            location: { id: unit.location_id, name: unit.location_name },
          },
        },
      },
    });
  } catch (error) {
    console.error("Update employee error:", error);
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ success: false, message: "Bu TC No zaten kayıtlı" });
    }
    res
      .status(500)
      .json({ success: false, message: "Çalışan güncellenirken hata oluştu" });
  }
}

// DELETE /employees/:id — Çalışan Sil
export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;

    const result = await withTransaction(async (client) => {
      const oldRes = await client.query('SELECT * FROM app.employees WHERE id = $1', [id]);
      if (oldRes.rows.length === 0) return null;
      const oldData = oldRes.rows[0];

      const { rows } = await client.query(
        "DELETE FROM app.employees WHERE id = $1 RETURNING id",
        [id]
      );

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.EMPLOYEE,
        description: `${oldData.first_name} ${oldData.last_name} isimli çalışan (TC: ${oldData.tc_no}) silindi.`,
        tableName: 'employees',
        recordId: id,
        oldData: oldData
      });

      return rows[0];
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Çalışan bulunamadı" });
    }

    res.json({ success: true, message: "Çalışan başarıyla silindi" });
  } catch (error) {
    console.error("Delete employee error:", error);
    res
      .status(500)
      .json({ success: false, message: "Çalışan silinirken hata oluştu" });
  }
}
