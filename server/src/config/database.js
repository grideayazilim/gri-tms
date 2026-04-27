/* ========================================================================
   VERİTABANI YAPILANDIRMASI (POSTGRESQL)
   Connection Pool ayarları ve Transaction yardımcı fonksiyonları
   ======================================================================== */
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../database/schema.js";

const { Pool } = pg;

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

// Drizzle ORM instance with the existing pool
export const db = drizzle(pool, { schema });

// withTransaction: Verilen fonksiyonu bir Transaction bloğu içinde çalıştırır.
// Hata durumunda otomatik ROLLBACK, başarı durumunda COMMIT yapar.
export async function withTransaction(fn) {

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
