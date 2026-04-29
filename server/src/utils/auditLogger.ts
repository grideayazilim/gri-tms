/* ========================================================================
   AUDIT LOGGER (DENETİM GÜNLÜĞÜ)
   Sistemdeki kritik aksiyonları veritabanına loglar.
   Kullanım: createAuditLog(executor, { action, actor, entityType, ... })
   ======================================================================== */
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared';
import type { AuditAction, AuditEntityType, AuthUser } from '@timesheet/shared';
import type { Request } from 'express';

import { auditLogs } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';

// Legacy PoolClient uyumluluk tipi — Phase 2'de kaldırılacak
interface LegacyPoolClient {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
}

// Phase 1 geçiş: executor hem Drizzle (DbExecutor) hem legacy PoolClient olabilir
type AuditExecutor = DbExecutor | LegacyPoolClient;

// ============================================================
// Audit logger tipleri
// ============================================================

interface FieldConfig {
  readonly label: string;
  readonly format: (v: unknown) => string;
}

type AuditActorRole = string;

interface AuditActor {
  readonly username: string;
  readonly role?: AuditActorRole | null;
}

interface CreateAuditLogParams {
  readonly action: AuditAction;
  readonly actor: AuditActor;
  readonly entityType?: AuditEntityType | null;
  readonly entityId?: string | null;
  readonly summary: string;
  readonly changes?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

// Legacy raw SQL — Phase 2'de silinecek
const SQL_INSERT = `
  INSERT INTO app.audit_logs
    (action, actor_username, actor_role, entity_type, entity_id, summary, changes, metadata)
  VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
`;

// Runtime check: executor Drizzle instance mı yoksa legacy PoolClient mı?
function isDrizzleExecutor(executor: AuditExecutor): executor is DbExecutor {
  return 'insert' in executor && typeof executor.insert === 'function';
}

// ============================================================
// Core audit log writer — Envanter A + S: raw SQL → Drizzle insert, DbExecutor kabul eder
// Legacy PoolClient backward compat korunuyor — Phase 2'de kaldırılacak
// ============================================================

export async function createAuditLog(executor: AuditExecutor, {
  action,
  actor,
  entityType = null,
  entityId = null,
  summary,
  changes = [],
  metadata = {},
}: CreateAuditLogParams): Promise<void> {
  if (!action) {
    console.error('[AUDIT] action zorunludur');
    return;
  }
  if (!actor || !actor.username) {
    console.error('[AUDIT] actor.username zorunludur');
    return;
  }
  if (!summary) {
    console.error('[AUDIT] summary zorunludur');
    return;
  }

  const changesArr = Array.isArray(changes) ? [...changes] : [];
  const metadataObj = metadata && typeof metadata === 'object' ? { ...metadata } : {};

  try {
    if (isDrizzleExecutor(executor)) {
      // Drizzle path — Phase 1+ callers (cronJobs.ts vb.)
      await executor.insert(auditLogs).values({
        action,
        actorUsername: actor.username,
        actorRole: actor.role ?? null,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        summary,
        changes: changesArr,
        metadata: metadataObj,
      });
    } else {
      // Legacy PoolClient path — Phase 2'de silinecek
      await executor.query(SQL_INSERT, [
        action,
        actor.username,
        actor.role ?? null,
        entityType,
        entityId,
        summary,
        JSON.stringify(changesArr),
        JSON.stringify(metadataObj),
      ]);
    }
  } catch (err: unknown) {
    // Audit log hatası ana işlemi durdurmamalı
    console.error('[AUDIT] log kaydedilemedi:', err);
  }
}

// ============================================================
// Actor helpers
// ============================================================

export function buildActor(req: Request): AuditActor {
  if (req.user?.username) {
    return { username: req.user.username, role: req.user.role || null };
  }
  return { username: 'SYSTEM', role: 'SYSTEM' };
}

export const SYSTEM_CRON_ACTOR: AuditActor = { username: 'SYSTEM_CRON', role: 'SYSTEM' };

// ============================================================
// Value formatters
// ============================================================

const fmtStr = (v: unknown): string => (v == null || v === '' ? '—' : String(v));

const fmtDate = (v: unknown): string => {
  if (v == null || v === '') return '—';
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
};

const fmtBool = (v: unknown): string => (v == null ? '—' : v ? 'Evet' : 'Hayır');

const fmtActive = (v: unknown): string => (v == null ? '—' : v ? 'Aktif' : 'Pasif');

const fmtMoney = (v: unknown): string => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
};

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a instanceof Date || b instanceof Date) {
    const aT = a instanceof Date ? a.getTime() : new Date(String(a)).getTime();
    const bT = b instanceof Date ? b.getTime() : new Date(String(b)).getTime();
    return aT === bT;
  }
  // Sayı/string karşılaştırmasında '500' vs 500 gibi durumlar için string'e indir
  return String(a) === String(b);
}

// FIELD_MAPS: Entity tipine göre hangi alanların loglanacağını belirleyen Whitelist.
// Not: Key'ler hâlâ snake_case — mevcut controller'lar raw SQL row'ları gönderiyor.
// Phase 2'de controller'lar Drizzle'a geçtiğinde key'ler camelCase'e çevrilecek.
export const FIELD_MAPS: Record<string, Record<string, FieldConfig>> = {

  [AUDIT_ENTITY_TYPE.EMPLOYEE]: {
    tc_no:      { label: 'TC No',                 format: fmtStr },
    first_name: { label: 'Ad',                    format: fmtStr },
    last_name:  { label: 'Soyad',                 format: fmtStr },
    iban_no:    { label: 'IBAN',                  format: fmtStr },
    unit_id:    { label: 'Birim',                 format: fmtStr },
    start_date: { label: 'İşe Başlama Tarihi',    format: fmtDate },
    end_date:   { label: 'İşten Çıkış Tarihi',    format: fmtDate },
    is_active:  { label: 'Çalışma Durumu',        format: fmtActive },
  },
  [AUDIT_ENTITY_TYPE.USER]: {
    username:    { label: 'Kullanıcı Adı',        format: fmtStr },
    role:        { label: 'Rol',                  format: fmtStr },
    status:      { label: 'Durum',                format: fmtStr },
    unit_id:     { label: 'Birim',                format: fmtStr },
    location_id: { label: 'Yerleşke',             format: fmtStr },
    expiry_date: { label: 'Son Kullanma Tarihi',  format: fmtDate },
  },
  [AUDIT_ENTITY_TYPE.ANNOUNCEMENT]: {
    title:   { label: 'Başlık', format: fmtStr },
    content: { label: 'İçerik', format: fmtStr },
  },
  [AUDIT_ENTITY_TYPE.LOCATION]: {
    name:       { label: 'Yerleşke Adı', format: fmtStr },
    program_no: { label: 'Program No',   format: fmtStr },
  },
  [AUDIT_ENTITY_TYPE.UNIT]: {
    name:        { label: 'Birim Adı', format: fmtStr },
    location_id: { label: 'Yerleşke',  format: fmtStr },
  },
  [AUDIT_ENTITY_TYPE.SETTINGS]: {
    daily_wage:         { label: 'Günlük Ücret',                  format: fmtMoney },
    max_weekly_days:    { label: 'Haftalık Maksimum Çalışma Günü', format: fmtStr },
    program_start_date: { label: 'Program Başlangıç Tarihi',      format: fmtDate },
    program_end_date:   { label: 'Program Bitiş Tarihi',          format: fmtDate },
  },
};

// ============================================================
// Diff helpers
// ============================================================

/**
 * Eski/yeni satırlardan değişen alanlar için
 * "Ad: 'Ahmet' → 'Mehmet'" formatında string array döner.
 */
export function diffFieldsAsChanges(
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  fieldMap: Record<string, FieldConfig>,
): string[] {
  if (!oldRow || !newRow || !fieldMap) return [];
  const out: string[] = [];
  for (const [key, cfg] of Object.entries(fieldMap)) {
    const oldVal: unknown = oldRow[key];
    const newVal: unknown = newRow[key];
    if (valuesEqual(oldVal, newVal)) continue;
    const fmt = cfg.format || fmtStr;
    out.push(`${cfg.label}: ${fmt(oldVal)} → ${fmt(newVal)}`);
  }
  return out;
}

/** Entity tipine göre whitelist'li diff. */
export function diffEntity(
  entityType: string,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
): string[] {
  const fieldMap = FIELD_MAPS[entityType];
  if (!fieldMap) return [];
  return diffFieldsAsChanges(oldRow, newRow, fieldMap);
}

// diffEntityWithLookups: ID alanlarını (Birim ID vb.) isimle göstermek için lookup haritası kullanır.
// lookups: { unit_id: { 'uuid': 'Birim Adı' } } şeklinde bir Payload bekler.
export function diffEntityWithLookups(
  entityType: string,
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>,
  lookups: Record<string, Record<string, string>> = {},
): string[] {
  const fieldMap = FIELD_MAPS[entityType];
  if (!fieldMap || !oldRow || !newRow) return [];
  const out: string[] = [];
  for (const [key, cfg] of Object.entries(fieldMap)) {
    const oldVal: unknown = oldRow[key];
    const newVal: unknown = newRow[key];
    if (valuesEqual(oldVal, newVal)) continue;
    const fmt = cfg.format || fmtStr;
    const lookup = lookups[key] ?? {};
    const fmtOld = oldVal != null && typeof oldVal === 'string' && lookup[oldVal] != null ? lookup[oldVal] : fmt(oldVal);
    const fmtNew = newVal != null && typeof newVal === 'string' && lookup[newVal] != null ? lookup[newVal] : fmt(newVal);
    out.push(`${cfg.label}: ${fmtOld} → ${fmtNew}`);
  }
  return out;
}

/**
 * Bir array'i max N öğeye truncate eder.
 * Son satırda "... ve N kayıt daha" notu bırakır.
 */
export function truncateChanges(items: readonly string[], max = 50): string[] {
  if (!Array.isArray(items)) return [];
  if (items.length <= max) return [...items];
  const remaining = items.length - max;
  return [...items.slice(0, max), `... ve ${remaining} kayıt daha`];
}
