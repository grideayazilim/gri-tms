import { withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";

// Tüm yerleşkeleri getir
export async function getLocations(req, res) {
  try {
    const result = await withTransaction(async (client) => {
      return await client.query(
        'SELECT id, name, program_no FROM app.locations ORDER BY name',
        []
      );
    });

    res.json({
      success: true,
      data: {
        locations: toCamelCase(result.rows),
      },
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Yerleşkeler alınırken hata oluştu',
    });
  }
}

// Bir yerleşkeye ait birimleri getir
export async function getUnitsByLocation(req, res) {
  try {
    const { locationId } = req.params;

    const result = await withTransaction(async (client) => {
      return await client.query(
        'SELECT id, name, location_id FROM app.units WHERE location_id = $1 ORDER BY name',
        [locationId]
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
