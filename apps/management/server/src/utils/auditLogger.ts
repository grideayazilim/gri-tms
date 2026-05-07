/* ========================================================================
   AUDIT LOGGER (DENETİM GÜNLÜĞÜ)
   Sistemdeki kritik aksiyonları veritabanına loglar.
   Kullanım: createAuditLog(executor, { action, actor, entityType, ... })
   ======================================================================== */
import { AUDIT_ENTITY_TYPE } from '@timesheet/shared';
import type { AuditAction, AuditEntityType, UserRole } from '@timesheet/shared';
import type { Request } from 'express';
import logger from './logger.js';

import { auditLogs } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';

// ============================================================
// Audit logger tipleri
// ============================================================

interface FieldConfig {
  readonly label: string;
  readonly format: (v: unknown) => string;
}

type AuditActorRole = UserRole | 'SYSTEM' | 'SYSTEM_CRON';

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

// ============================================================
// Core audit log writer — Drizzle insert
// ============================================================

export async function createAuditLog(executor: DbExecutor, {
  action,
  actor,
  entityType = null,
  entityId = null,
  summary,
  changes = [],
  metadata = {},
}: CreateAuditLogParams): Promise<void> {
  if (!action) {
    logger.warn('[AUDIT] action zorunludur');
    return;
  }
  if (!actor || !actor.username) {
    logger.warn('[AUDIT] actor.username zorunludur');
    return;
  }
  if (!summary) {
    logger.warn('[AUDIT] summary zorunludur');
    return;
  }

  const changesArr = Array.isArray(changes) ? [...changes] : [];
  const metadataObj = metadata && typeof metadata === 'object' ? { ...metadata } : {};

  try {
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
  } catch (err: unknown) {
    // Audit log hatası ana işlemi durdurmamalı
    logger.error('[AUDIT] log kaydedilemedi', { error: err instanceof Error ? err.message : String(err) });
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
// Key'ler camelCase — Drizzle row'ları doğrudan camelCase döndürdüğü için.
export const FIELD_MAPS: Partial<Record<AuditEntityType, Record<string, FieldConfig>>> = {

  [AUDIT_ENTITY_TYPE.EMPLOYEE]: {
    tcNo:       { label: 'TC No',                 format: fmtStr },
    firstName:  { label: 'Ad',                    format: fmtStr },
    lastName:   { label: 'Soyad',                 format: fmtStr },
    ibanNo:     { label: 'IBAN',                  format: fmtStr },
    unitId:     { label: 'Birim',                 format: fmtStr },
    startDate:  { label: 'İşe Başlama Tarihi',    format: fmtDate },
    endDate:    { label: 'İşten Çıkış Tarihi',    format: fmtDate },
    isActive:   { label: 'Çalışma Durumu',        format: fmtActive },
  },
  [AUDIT_ENTITY_TYPE.USER]: {
    username:    { label: 'Kullanıcı Adı',        format: fmtStr },
    role:        { label: 'Rol',                  format: fmtStr },
    status:      { label: 'Durum',                format: fmtStr },
    unitId:      { label: 'Birim',                format: fmtStr },
    locationId:  { label: 'Yerleşke',             format: fmtStr },
    expiryDate:  { label: 'Son Kullanma Tarihi',  format: fmtDate },
  },
  [AUDIT_ENTITY_TYPE.ANNOUNCEMENT]: {
    title:   { label: 'Başlık', format: fmtStr },
    content: { label: 'İçerik', format: fmtStr },
  },
  [AUDIT_ENTITY_TYPE.LOCATION]: {
    name:       { label: 'Yerleşke Adı', format: fmtStr },
    programNo:  { label: 'Program No',   format: fmtStr },
  },
  [AUDIT_ENTITY_TYPE.UNIT]: {
    name:       { label: 'Birim Adı', format: fmtStr },
    locationId: { label: 'Yerleşke',  format: fmtStr },
  },
  [AUDIT_ENTITY_TYPE.SETTINGS]: {
    dailyWage:        { label: 'Günlük Ücret',                  format: fmtMoney },
    maxWeeklyDays:    { label: 'Haftalık Maksimum Çalışma Günü', format: fmtStr },
    programStartDate: { label: 'Program Başlangıç Tarihi',      format: fmtDate },
    programEndDate:   { label: 'Program Bitiş Tarihi',          format: fmtDate },
  },
};

// ============================================================
// Diff helpers
// ============================================================

/**
 * Eski/yeni satırlardan değişen alanlar için
 * "Ad: 'Ahmet' → 'Mehmet'" formatında string array döner.
 */
export function diffFieldsAsChanges<
  Old extends Record<string, unknown>,
  New extends Record<string, unknown>,
>(
  oldRow: Old,
  newRow: New,
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
export function diffEntity<
  Old extends Record<string, unknown>,
  New extends Record<string, unknown>,
>(
  entityType: AuditEntityType,
  oldRow: Old,
  newRow: New,
): string[] {
  const fieldMap = FIELD_MAPS[entityType];
  if (!fieldMap) return [];
  return diffFieldsAsChanges(oldRow, newRow, fieldMap);
}

// diffEntityWithLookups: ID alanlarını (Birim ID vb.) isimle göstermek için lookup haritası kullanır.
// lookups: { unitId: { 'uuid': 'Birim Adı' } } şeklinde bir Payload bekler.
export function diffEntityWithLookups<
  Old extends Record<string, unknown>,
  New extends Record<string, unknown>,
>(
  entityType: AuditEntityType,
  oldRow: Old,
  newRow: New,
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
