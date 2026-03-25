import { withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog } from "../utils/auditLogger.js"; // İşlem kaydı (audit log) oluşturmak için gerekli
import { AUDIT_EVENT } from "../enums/auditEventTypes.js"; // İşlem türlerini (entity tiplerini) belirlemek için

// ==================== OKUMA (GET) İŞLEMLERİ ====================


// Veritabanından tüm yerleşke (campus) bilgilerini çeker
export async function getLocations(req, res) {
  try {
    // Veritabanı bağlantısı açar ve sorguyu bir işlem (transaction) içinde güvenlice çalıştırır
    const result = await withTransaction(async (client) => {
      // API contract örneğine uygun olarak alanları ve ISO 8601 tarih formatını (YYYY-MM-DDTHH:MM:SSZ) seçeriz
      return await client.query(
        `SELECT 
          id, 
          name, 
          program_no, 
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at 
        FROM app.locations 
        ORDER BY name`,
        [] // Herhangi bir parametre (filtre) yok
      );
    });

    // Başarılı sonucu JSON formatında döndürür
    res.json({
      success: true,
      data: {
        // toCamelCase: Veritabanındaki snake_case (örn: program_no) isimleri camelCase'e (örn: programNo) çevirir
        locations: toCamelCase(result.rows),
      },
    });
  } catch (error) {
    // Hata durumunda konsola yazdırır ve 500 hata koduyla kullanıcıya bildirir
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Yerleşkeler alınırken hata oluştu',
    });
  }
}

// Veritabanındaki tüm birimleri (units) listeler ve her birime kayıtlı çalışan sayısını hesaplar
export async function getUnits(req, res) {
  try {
    const result = await withTransaction(async (client) => {
      // app.units tablosunu app.employees ile bağlayıp (JOIN) çalışan sayısını (COUNT) alırız
      // API contract örneğindeki alan sırasına ve ISO tarih formatına sadık kalıyoruz
      return await client.query(
        `SELECT 
          u.id, 
          u.location_id, 
          u.name, 
          COUNT(e.id)::int AS employee_count,
          to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
          to_char(u.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
        FROM app.units u
        LEFT JOIN app.employees e ON u.id = e.unit_id
        GROUP BY u.id
        ORDER BY u.name`,
        []
      );
    });

    res.json({
      success: true,
      data: {
        // Veriyi frontend'in anladığı camelCase (employeeCount) formatına dönüştürüp gönderir
        units: toCamelCase(result.rows),
      },
    });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      success: false,
      message: 'Birimler alınırken hata oluştu',
    });
  }
}

// Belirli bir yerleşkeye (locationId'ye) bağlı birimleri ve çalışan sayılarını getirir
/*
Çalışıyor mu diye bakmak için şu adreslere bakabilirsiniz:

  http://localhost:3000/api/locationAndUnits/locations/59dc50b5-59ab-4a4f-9a95-41a17d080e41/units
  
  http://localhost:3000/api/locationAndUnits/locations/774eb9bd-eebc-40d8-8f6c-48acf42811e2/units

*/
export async function getUnitsByLocation(req, res) {
  try {
    // URL'den gelen locationId parametresini alır (örn: /locations/uuid/units)
    const { locationId } = req.params;

    const result = await withTransaction(async (client) => {
      // location_id sütunu, gelen parametreye eşit olan birimleri filtreler ve çalışanlarını sayar
      // API contract örneğine (3.3) uygun alan sırası ve tarih formatı
      return await client.query(
        `SELECT 
          u.id, 
          u.location_id, 
          u.name, 
          COUNT(e.id)::int AS employee_count,
          to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
          to_char(u.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
        FROM app.units u
        LEFT JOIN app.employees e ON u.id = e.unit_id
        WHERE u.location_id = $1
        GROUP BY u.id
        ORDER BY u.name`,
        [locationId] // $1 yerine bu değişken güvenli bir şekilde yerleştirilir
      );
    });

    res.json({
      success: true,
      data: {
        units: toCamelCase(result.rows),
      },
    });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      success: false,
      message: 'Birimler alınırken hata oluştu',
    });
  }
}


// ==================== YAZMA (POST) İŞLEMLERİ ====================


// Yeni bir yerleşke (campus) oluşturur
export async function createLocation(req, res) {
  try {
    // Request body'den gelen bilgileri alıyoruz
    const { name, programNo } = req.body;

    // Zorunlu alanların kontrolü (Validasyon)
    if (!name || !programNo) {
      return res.status(400).json({
        success: false,
        message: 'Yerleşke adı ve program numarası gereklidir.',
      });
    }

    // Veritabanı işlemini bir "Transaction" (işlem) bloğu içinde yapıyoruz. 
    // Bu sayede hata olursa her şey otomatik olarak geri alınır (rollback).
    const result = await withTransaction(async (client) => {
      // 1. Yeni yerleşkeyi veritabanına ekle
      // to_char kullanarak tarihleri contract'taki gibi ISO formatında (Z ile biten) alıyoruz
      const insertResult = await client.query(
        `INSERT INTO app.locations (name, program_no) 
         VALUES ($1, $2) 
         RETURNING id, name, program_no, 
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
        [name, programNo]
      );

      const newLocation = insertResult.rows[0];

      // 2. İşlem Kaydı (Audit Log) Oluştur
      // Kimin, ne zaman, hangi tabloya ne eklediğini kaydediyoruz.
      await createAuditLog(client, {
        username: req.user.username, // authMiddleware'den gelen kullanıcı adı
        userRole: req.user.role,     // Kullanıcı rolü (Admin)
        eventType: AUDIT_EVENT.LOCATION_UNIT, // "Yerleşke/Birim" işlem türü
        description: `${name} adlı yeni yerleşke oluşturuldu.`,
        tableName: 'locations',
        recordId: newLocation.id,
        newData: newLocation // Eklenen yeni verinin tamamı
      });

      return newLocation;
    });

    // Başarılı sonucu (201 Created) döndür
    res.status(201).json({
      success: true,
      data: {
        location: toCamelCase(result),
      },
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({
      success: false,
      message: 'Yerleşke oluşturulurken hata oluştu',
    });
  }
}

// Yeni bir birim (unit) oluşturur
export async function createUnit(req, res) {
  try {
    // locationId: Hangi yerleşkeye bağlı olduğu, name: Birim adı
    const { locationId, name } = req.body;

    if (!locationId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Yerleşke ID ve birim adı gereklidir.',
      });
    }

    const result = await withTransaction(async (client) => {
      // 1. Yerleşke var mı kontrol et (Fiziksel olmayan bir yere birim eklenemez)
      const locCheck = await client.query('SELECT id FROM app.locations WHERE id = $1', [locationId]);
      if (locCheck.rows.length === 0) {
        throw new Error('LOCATION_NOT_FOUND');
      }

      // 2. Birimi ekle
      const insertResult = await client.query(
        `INSERT INTO app.units (location_id, name) 
         VALUES ($1, $2) 
         RETURNING id, location_id, name, 
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
        [locationId, name]
      );

      const newUnit = insertResult.rows[0];

      // 3. İşlem Kaydı (Audit Log)
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.LOCATION_UNIT,
        description: `${name} adlı yeni birim oluşturuldu.`,
        tableName: 'units',
        recordId: newUnit.id,
        newData: newUnit
      });

      return newUnit;
    });

    res.status(201).json({
      success: true,
      data: {
        unit: toCamelCase(result),
      },
    });
  } catch (error) {
    if (error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Belirtilen yerleşke bulunamadı.' });
    }
    console.error('Create unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Birim oluşturulurken hata oluştu',
    });
  }
}



// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

// Mevcut bir yerleşke bilgisini günceller
export async function updateLocation(req, res) {
  try {
    const { locationId } = req.params; // URL'den gelen ID (örn: /locations/uuid)
    const { name, programNo } = req.body; // Yeni veriler

    // Validasyon
    if (!name || !programNo) {
      return res.status(400).json({
        success: false,
        message: 'Yerleşke adı ve program numarası gereklidir.',
      });
    }

    const result = await withTransaction(async (client) => {
      // 1. Önce veriyi kontrol et ve eski halini çek (Audit log için saklıyoruz)
      const oldResult = await client.query('SELECT * FROM app.locations WHERE id = $1', [locationId]);
      if (oldResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      // 2. Güncelleme sorgusu
      // NOW() ile updated_at alanını o anki zamana set ediyoruz
      const updateResult = await client.query(
        `UPDATE app.locations 
         SET name = $1, program_no = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING id, name, program_no, 
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
        [name, programNo, locationId]
      );

      const updatedLocation = updateResult.rows[0];

      // 3. İşlem Kaydı (Audit Log)
      // Güncelleme işlemlerinde hem eski (oldData) hem yeni (newData) veriyi tutmak çok önemlidir.
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.LOCATION_UNIT,
        description: `${name} adlı yerleşke bilgileri güncellendi.`,
        tableName: 'locations',
        recordId: locationId,
        oldData: oldResult.rows[0], // Değişmeden önceki hali
        newData: updatedLocation    // Yeni hali
      });

      return updatedLocation;
    });

    res.json({
      success: true,
      data: {
        location: toCamelCase(result),
      },
    });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Yerleşke bulunamadı.' });
    }
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Yerleşke güncellenirken hata oluştu',
    });
  }
}

// Mevcut bir birim bilgisini günceller
export async function updateUnit(req, res) {
  try {
    const { unitId } = req.params;
    const { locationId, name } = req.body;

    if (!locationId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Yerleşke ID ve birim adı gereklidir.',
      });
    }

    const result = await withTransaction(async (client) => {
      // 1. Birim var mı?
      const oldResult = await client.query('SELECT * FROM app.units WHERE id = $1', [unitId]);
      if (oldResult.rows.length === 0) {
        throw new Error('UNIT_NOT_FOUND');
      }

      // 2. Yeni atanacak yerleşke var mı?
      const locCheck = await client.query('SELECT id FROM app.locations WHERE id = $1', [locationId]);
      if (locCheck.rows.length === 0) {
        throw new Error('LOCATION_NOT_FOUND');
      }

      // 3. Güncelle
      const updateResult = await client.query(
        `UPDATE app.units 
         SET location_id = $1, name = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING id, location_id, name, 
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
        [locationId, name, unitId]
      );

      const updatedUnit = updateResult.rows[0];

      // 4. İşlem Kaydı
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.LOCATION_UNIT,
        description: `${name} adlı birim güncellendi.`,
        tableName: 'units',
        recordId: unitId,
        oldData: oldResult.rows[0],
        newData: updatedUnit
      });

      return updatedUnit;
    });

    res.json({
      success: true,
      data: {
        unit: toCamelCase(result),
      },
    });
  } catch (error) {
    if (error.message === 'UNIT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Birim bulunamadı.' });
    }
    if (error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Belirtilen yerleşke bulunamadı.' });
    }
    console.error('Update unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Birim güncellenirken hata oluştu',
    });
  }
}


// Belirtilen Yerleşke'yi ve Ona Bağlı Birimleri Tek Seferde Senkronize Eder
// Bu endpoint, frontend'den gelen tüm yerleşke ağacını (nested units) veritabanıyla eşitler.
// 1. Yerleşke bilgilerini günceller.
// 2. Gelen listedeki birimleri günceller veya yeni ekler.
// 3. Gelen listede OLMAYAN ama veritabanında VAR OLAN birimleri (eğer çalışanları yoksa) siler.
export async function syncLocationWithUnits(req, res) {
  try {
    const { locationId } = req.params;
    const { name, programNo, units } = req.body; // units, [{id, name}, ...] şeklinde bir dizi

    if (!name || !programNo || !Array.isArray(units)) {
      return res.status(400).json({
        success: false,
        message: 'Yerleşke adı, program numarası ve birim listesi gereklidir.',
      });
    }

    const result = await withTransaction(async (client) => {
      // 1. Yerleşke bilgilerini güncelle
      const locUpdate = await client.query(
        `UPDATE app.locations 
         SET name = $1, program_no = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING id, name, program_no`,
        [name, programNo, locationId]
      );

      if (locUpdate.rows.length === 0) {
        throw new Error('LOCATION_NOT_FOUND');
      }

      // 2. Mevcut birimleri tespit et (Silme kontrolü için)
      const currentUnitsRes = await client.query(
        'SELECT id FROM app.units WHERE location_id = $1',
        [locationId]
      );
      const dbUnitIds = currentUnitsRes.rows.map(r => r.id);

      // 3. Gelen listedeki birimleri işle (Ekleme veya Güncelleme)
      const processedUnitIds = [];

      for (const unit of units) {
        if (!unit.name || !unit.name.trim()) {
          throw new Error('EMPTY_UNIT_NAME');
        }

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unit.id);

        if (isUuid && dbUnitIds.includes(unit.id)) {
          // GÜNCELLEME: Mevcut bir birim
          await client.query(
            'UPDATE app.units SET name = $1, updated_at = NOW() WHERE id = $2 AND location_id = $3',
            [unit.name, unit.id, locationId]
          );
          processedUnitIds.push(unit.id);
        } else {
          // EKLEME: Yeni bir birim (id yoksa veya UUID değilse)
          const insertRes = await client.query(
            'INSERT INTO app.units (location_id, name) VALUES ($1, $2) RETURNING id',
            [locationId, unit.name]
          );
          processedUnitIds.push(insertRes.rows[0].id);
        }
      }

      // 4. SİLME: DB'de olan ama gelen listede olmayanları sil
      const unitsToDelete = dbUnitIds.filter(id => !processedUnitIds.includes(id));

      for (const unitIdToDelete of unitsToDelete) {
        // Bağımlılık kontrolü: Bu birime bağlı çalışan var mı?
        const empCheck = await client.query(
          'SELECT 1 FROM app.employees WHERE unit_id = $1 LIMIT 1',
          [unitIdToDelete]
        );

        if (empCheck.rows.length > 0) {
          // Eğer çalışan varsa işlemi durdur ve hata fırlat (Transaction geri alınır)
          throw new Error(`UNIT_HAS_EMPLOYEES_${unitIdToDelete}`);
        }

        // Çalışan yoksa sil
        await client.query('DELETE FROM app.units WHERE id = $1', [unitIdToDelete]);
      }

      // 5. İşlem Kaydı (Audit Log)
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.LOCATION_UNIT,
        description: `${name} yerleşkesi ve bağlı birimleri toplu olarak senkronize edildi.`,
        tableName: 'locations_bulk_sync',
        recordId: locationId,
        newData: { name, programNo, unitsCount: units.length }
      });

      return { locationId, updatedUnits: processedUnitIds.length };
    });

    res.json({
      success: true,
      message: 'Yerleşke ve birimler başarıyla senkronize edildi.',
      data: result
    });

  } catch (error) {
    if (error.message === 'EMPTY_UNIT_NAME') {
      return res.status(400).json({ success: false, message: 'Birim adı boş bırakılamaz.' });
    }
    if (error.message === 'LOCATION_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Yerleşke bulunamadı.' });
    }
    if (error.message.startsWith('UNIT_HAS_EMPLOYEES_')) {
      return res.status(400).json({
        success: false,
        message: 'Bazı birimler silinemedi çünkü içlerinde kayıtlı çalışanlar var. Lütfen önce çalışanları transfer edin.'
      });
    }
    console.error('Bulk sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu eşitleme sırasında bir hata oluştu.',
      error: error.message
    });
  }
}



// ==================== SİLME (DELETE) İŞLEMLERİ ====================

// Bir yerleşkeyi veritabanından siler
export async function deleteLocation(req, res) {
  try {
    const { locationId } = req.params;

    await withTransaction(async (client) => {
      // 1. Bağımlılık Kontrolü (Business Logic):
      // Eğer bu yerleşkeye bağlı birimler (units) varsa silme işlemini engelliyoruz.
      // SQL: SELECT 1 ile sadece varlık kontrolü yapıyoruz (performans için).
      const unitCheck = await client.query('SELECT 1 FROM app.units WHERE location_id = $1 LIMIT 1', [locationId]);
      if (unitCheck.rows.length > 0) {
        throw new Error('HAS_DEPENDENTS');
      }

      // 2. Eski veriyi al (Audit log için)
      const oldResult = await client.query('SELECT * FROM app.locations WHERE id = $1', [locationId]);
      if (oldResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      // 3. Silme işlemini yap
      await client.query('DELETE FROM app.locations WHERE id = $1', [locationId]);

      // 4. İşlem Kaydı (Audit Log)
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.LOCATION_UNIT,
        description: `${oldResult.rows[0].name} adlı yerleşke silindi.`,
        tableName: 'locations',
        recordId: locationId,
        oldData: oldResult.rows[0] // Silinen verinin son hali
      });
    });

    res.json({
      success: true,
      message: 'Yerleşke başarıyla silindi.',
    });
  } catch (error) {
    if (error.message === 'HAS_DEPENDENTS') {
      return res.status(400).json({
        success: false,
        message: 'Bu yerleşkeye bağlı birimler olduğu için silinemez. Önce yerleşkedeki birimleri silmelisiniz.'
      });
    }
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Yerleşke bulunamadı.' });
    }
    console.error('Delete location error:', error);
    res.status(500).json({
      success: false,
      message: 'Yerleşke silinirken hata oluştu',
    });
  }
}

// Bir birimi veritabanından siler
export async function deleteUnit(req, res) {
  try {
    const { unitId } = req.params;

    await withTransaction(async (client) => {
      // 1. Bağımlılık Kontrolü:
      // Eğer bu birime kayıtlı çalışanlar (employees) varsa silme işlemini engelliyoruz.
      const employeeCheck = await client.query('SELECT 1 FROM app.employees WHERE unit_id = $1 LIMIT 1', [unitId]);
      if (employeeCheck.rows.length > 0) {
        throw new Error('HAS_DEPENDENTS');
      }

      // 2. Eski veriyi al
      const oldResult = await client.query('SELECT * FROM app.units WHERE id = $1', [unitId]);
      if (oldResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      // 3. Silme işlemini yap
      await client.query('DELETE FROM app.units WHERE id = $1', [unitId]);

      // 4. İşlem Kaydı
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.LOCATION_UNIT,
        description: `${oldResult.rows[0].name} adlı birim silindi.`,
        tableName: 'units',
        recordId: unitId,
        oldData: oldResult.rows[0]
      });
    });

    res.json({
      success: true,
      message: 'Birim başarıyla silindi.',
    });
  } catch (error) {
    if (error.message === 'HAS_DEPENDENTS') {
      return res.status(400).json({
        success: false,
        message: 'Bu birime bağlı çalışanlar olduğu için silinemez. Önce çalışanları transfer etmeli veya silmelisiniz.'
      });
    }
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Birim bulunamadı.' });
    }
    console.error('Delete unit error:', error);
    res.status(500).json({
      success: false,
      message: 'Birim silinirken hata oluştu',
    });
  }
}


// export async function __controller_fonksiyon_adı__(req, res) { ... }
