/* ========================================================================
   VERİTABANI YAPILANDIRMASI (POSTGRESQL)
   Connection Pool ayarları, tipli Drizzle instance ve Transaction yardımcıları
   ======================================================================== */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT !== undefined ? parseInt(process.env.DB_PORT, 10) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_APP_USER,
  password: process.env.DB_APP_PASSWORD,
  // Havuz tükenmesi ve asılı transaction koruması
  max: 25,                                     // 10 → 25 (PG varsayılan max_connections=100)
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,              // 2s → 10s; 2 saniye çok agresifti
  statement_timeout: 30000,                    // kaçak sorguyu kes
  idle_in_transaction_session_timeout: 60000,  // asılı transaction bağlantıyı sonsuza kadar tutmasın
  application_name: 'gri-tms-server',          // pg_stat_activity'de görünür
});

// Havuz seviyesindeki beklenmeyen hatalar process'i düşürmesin
pool.on('error', (err: Error) => {
  logger.error('Beklenmeyen veritabanı havuzu hatası', { error: err.message });
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

