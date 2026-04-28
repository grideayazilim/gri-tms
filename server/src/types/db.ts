/* ========================================================================
   VERİTABANI YARDIMCI TİPLERİ
   Drizzle instance ve transaction için ortak executor tipi
   ======================================================================== */
import type { db, TransactionClient } from '../config/database.js';

// DbExecutor: auditLogger ve repo'lar hem db hem tx üzerinden çağrılabilir
export type DbExecutor = typeof db | TransactionClient;
