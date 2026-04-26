/* ========================================================================
   AUDIT LOGGER (DENETİM GÜNLÜĞÜ)
   Sistemdeki kritik aksiyonları veritabanına loglar.
   Kullanım: createAuditLog(client, { action, actor, entityType, ... })
   ======================================================================== */
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared';


const SQL_INSERT = `
  INSERT INTO app.audit_logs
    (action, actor_username, actor_role, entity_type, entity_id, summary, changes, metadata)
  VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
`;

export async function createAuditLog(client, {
  action,
  actor,
  entityType = null,
  entityId = null,
  summary,
  changes = [],
  metadata = {},
}) {
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

  try {
    await client.query(SQL_INSERT, [
      action,
      actor.username,
      actor.role ?? null,
      entityType,
      entityId,
      summary,
      JSON.stringify(Array.isArray(changes) ? changes : []),
      JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
    ]);
  } catch (err) {
    // Audit log hatası ana işlemi durdurmamalı
    console.error('[AUDIT] log kaydedilemedi:', err);
  }
}

// ============================================================
// Actor helpers
// ============================================================

export function buildActor(req) {
  if (req?.user?.username) {
    return { username: req.user.username, role: req.user.role || null };
  }
  return { username: 'SYSTEM', role: 'SYSTEM' };
}

export const SYSTEM_CRON_ACTOR = { username: 'SYSTEM_CRON', role: 'SYSTEM' };

// ============================================================
// Value formatters
// ============================================================

const fmtStr   = (v) => (v == null || v === '' ? '—' : String(v));
const fmtDate  = (v) => {
  if (v == null || v === '') return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
};
const fmtBool   = (v) => (v == null ? '—' : v ? 'Evet' : 'Hayır');
const fmtActive = (v) => (v == null ? '—' : v ? 'Aktif' : 'Pasif');
const fmtMoney  = (v) => {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
};

function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a instanceof Date || b instanceof Date) {
    const aT = a instanceof Date ? a.getTime() : new Date(a).getTime();
    const bT = b instanceof Date ? b.getTime() : new Date(b).getTime();
    return aT === bT;
  }
  // Sayı/string karşılaştırmasında '500' vs 500 gibi durumlar için string'e indir
  return String(a) === String(b);
}

// FIELD_MAPS: Entity tipine göre hangi alanların loglanacağını belirleyen Whitelist.
// Key -> { label: 'Görünen İsim', format: 'Değer Biçimlendirici' }
export const FIELD_MAPS = {

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
export function diffFieldsAsChanges(oldRow, newRow, fieldMap) {
  if (!oldRow || !newRow || !fieldMap) return [];
  const out = [];
  for (const [key, cfg] of Object.entries(fieldMap)) {
    const oldVal = oldRow[key];
    const newVal = newRow[key];
    if (valuesEqual(oldVal, newVal)) continue;
    const fmt = cfg.format || fmtStr;
    out.push(`${cfg.label}: ${fmt(oldVal)} → ${fmt(newVal)}`);
  }
  return out;
}

/** Entity tipine göre whitelist'li diff. */
export function diffEntity(entityType, oldRow, newRow) {
  const fieldMap = FIELD_MAPS[entityType];
  if (!fieldMap) return [];
  return diffFieldsAsChanges(oldRow, newRow, fieldMap);
}

// diffEntityWithLookups: ID alanlarını (Birim ID vb.) isimle göstermek için lookup haritası kullanır.
// lookups: { unit_id: { 'uuid': 'Birim Adı' } } şeklinde bir Payload bekler.
export function diffEntityWithLookups(entityType, oldRow, newRow, lookups = {}) {
  const fieldMap = FIELD_MAPS[entityType];
  if (!fieldMap || !oldRow || !newRow) return [];
  const out = [];
  for (const [key, cfg] of Object.entries(fieldMap)) {
    const oldVal = oldRow[key];
    const newVal = newRow[key];
    if (valuesEqual(oldVal, newVal)) continue;
    const fmt = cfg.format || fmtStr;
    const lookup = lookups[key] || {};
    const fmtOld = oldVal != null && lookup[oldVal] != null ? lookup[oldVal] : fmt(oldVal);
    const fmtNew = newVal != null && lookup[newVal] != null ? lookup[newVal] : fmt(newVal);
    out.push(`${cfg.label}: ${fmtOld} → ${fmtNew}`);
  }
  return out;
}

/**
 * Bir array'i max N öğeye truncate eder.
 * Son satırda "... ve N kayıt daha" notu bırakır.
 */
export function truncateChanges(items, max = 50) {
  if (!Array.isArray(items)) return [];
  if (items.length <= max) return items;
  const remaining = items.length - max;
  return [...items.slice(0, max), `... ve ${remaining} kayıt daha`];
}
