import { withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";

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
