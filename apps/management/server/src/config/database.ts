/* ========================================================================
   VERİTABANI YAPILANDIRMASI (POSTGRESQL)
   Connection Pool ayarları, tipli Drizzle instance ve Transaction yardımcıları
   ======================================================================== */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema.js';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT !== undefined ? parseInt(process.env.DB_PORT, 10) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_APP_USER,
  password: process.env.DB_APP_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

// Drizzle transaction client tipi — Phase 1+ için auditLogger ve repo'larda kullanılır
export type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

// DbExecutor: hem top-level db instance hem Drizzle transaction client kabul eder
export type { TransactionClient as DrizzleTransactionClient };

// Drizzle-native transaction helper — Phase 1+ utils ve Phase 2+ controller'lar için
export async function withDrizzleTransaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => fn(tx));
}

