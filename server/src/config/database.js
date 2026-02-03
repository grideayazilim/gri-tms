import pg from "pg";
const { Pool } = pg;

// Database bağlantısı (app.js'te çağırılıyor)
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Transaction'lı database istek fonksiyonu (kullanımı testController'da)
export async function withTransaction(fn, context) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // RLS için user bilgilerini DB'ye gönder
    await client.query(
      `
      SELECT
        set_config('app.user_id',     $1, true),
        set_config('app.role',        $2, true),
        set_config('app.location_id', $3, true),
        set_config('app.unit_id',     $4, true)
      `,
      [
        context.userId ?? "",
        context.role ?? "",
        context.locationId ?? "",
        context.unitId ?? ""
      ]
    );

    const result = await fn(client);

    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
