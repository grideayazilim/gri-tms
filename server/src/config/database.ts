/* ========================================================================
   VERİTABANI YAPILANDIRMASI (POSTGRESQL)
   Connection Pool ayarları, tipli Drizzle instance ve Transaction yardımcıları
   ======================================================================== */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import * as schema from '../../database/schema.js';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT !== undefined ? parseInt(process.env.DB_PORT, 10) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

// Drizzle transaction client tipi — Phase 1+ için auditLogger ve repo'larda kullanılır
export type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

// DbExecutor: hem top-level db instance hem Drizzle transaction client kabul eder
export type { TransactionClient as DrizzleTransactionClient };

// withTransaction: Phase 0 — mevcut .js controller'larla backward compat (pool.connect tabanlı).
// Phase 1+ geçişinde controller'lar db.transaction() kullanacak; bu helper kaldırılacak.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
