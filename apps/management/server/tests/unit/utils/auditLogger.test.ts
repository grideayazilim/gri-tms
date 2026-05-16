import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../../database/schema.js', () => ({
  auditLogs: { name: 'audit_logs' },
  users: {},
  locations: {},
  units: {},
  settings: {},
  periods: {},
}))

import {
  createAuditLog,
  buildActor,
  diffFieldsAsChanges,
  diffEntity,
  diffEntityWithLookups,
  truncateChanges,
  FIELD_MAPS,
} from '../../../src/utils/auditLogger.js'
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared'
import { createMockDb } from '../../helpers/mockDb.js'

beforeEach(() => {
  vi.clearAllMocks()
})

const validParams = {
  action: AUDIT_ACTION.USER_CREATE,
  actor: { username: 'admin', role: 'ADMIN' as const },
  summary: 'Yeni kullanıcı oluşturuldu',
}

describe('createAuditLog', () => {
  it('geçerli parametrelerle insert çağrılır', async () => {
    const { executor, mockInsert } = createMockDb()
    await createAuditLog(executor as never, validParams)
    expect(executor.insert).toHaveBeenCalledOnce()
    expect(mockInsert.values).toHaveBeenCalledOnce()
  })

  it('action eksikse insert çağrılmaz (logger.warn)', async () => {
    const { executor } = createMockDb()
    await createAuditLog(executor as never, { ...validParams, action: '' as never })
    expect(executor.insert).not.toHaveBeenCalled()
  })

  it('actor.username eksikse insert çağrılmaz', async () => {
    const { executor } = createMockDb()
    await createAuditLog(executor as never, { ...validParams, actor: { username: '', role: 'ADMIN' } })
    expect(executor.insert).not.toHaveBeenCalled()
  })

  it('summary eksikse insert çağrılmaz', async () => {
    const { executor } = createMockDb()
    await createAuditLog(executor as never, { ...validParams, summary: '' })
    expect(executor.insert).not.toHaveBeenCalled()
  })

  it('insert hata fırlatırsa hata yutulur (işlem durmaz)', async () => {
    const { executor, mockInsert } = createMockDb()
    mockInsert.values.mockRejectedValue(new Error('DB bağlantı hatası'))
    await expect(createAuditLog(executor as never, validParams)).resolves.toBeUndefined()
  })

  it('entityType ve entityId null varsayılan ile insert çağrılır', async () => {
    const { executor, mockInsert } = createMockDb()
    await createAuditLog(executor as never, validParams)
    const insertedValues = mockInsert.values.mock.calls[0][0]
    expect(insertedValues.entityType).toBeNull()
    expect(insertedValues.entityId).toBeNull()
  })
})

describe('diffFieldsAsChanges', () => {
  const fieldMap = FIELD_MAPS[AUDIT_ENTITY_TYPE.EMPLOYEE]!

  it('değişen alanlar için diff string üretir', () => {
    const result = diffFieldsAsChanges(
      { firstName: 'Ahmet' },
      { firstName: 'Mehmet' },
      fieldMap,
    )
    expect(result.some(s => s.includes('Ahmet') && s.includes('Mehmet'))).toBe(true)
  })

  it('aynı değerler için boş array döner', () => {
    const result = diffFieldsAsChanges(
      { firstName: 'Ahmet' },
      { firstName: 'Ahmet' },
      fieldMap,
    )
    expect(result).toHaveLength(0)
  })

  it('null → değer değişimini tespit eder', () => {
    const result = diffFieldsAsChanges({ endDate: null }, { endDate: '2024-12-31' }, fieldMap)
    expect(result.length).toBeGreaterThan(0)
  })

  it('eksik oldRow veya newRow için boş array döner', () => {
    expect(diffFieldsAsChanges(null as never, {}, fieldMap)).toEqual([])
    expect(diffFieldsAsChanges({}, null as never, fieldMap)).toEqual([])
  })
})

describe('diffEntity', () => {
  it('bilinen entity tipi için diff üretir', () => {
    const result = diffEntity(
      AUDIT_ENTITY_TYPE.EMPLOYEE,
      { firstName: 'Ahmet', lastName: 'Yılmaz' },
      { firstName: 'Mehmet', lastName: 'Yılmaz' },
    )
    expect(result.length).toBeGreaterThan(0)
  })

  it('bilinmeyen entity tipi için boş array döner', () => {
    const result = diffEntity('unknown' as never, { x: 1 }, { x: 2 })
    expect(result).toEqual([])
  })
})

describe('buildActor', () => {
  it('req.user varsa username ve role döner', () => {
    const req = { user: { username: 'admin', role: 'ADMIN' } } as never
    const actor = buildActor(req)
    expect(actor.username).toBe('admin')
    expect(actor.role).toBe('ADMIN')
  })

  it('req.user yoksa SYSTEM actor döner', () => {
    const req = {} as never
    const actor = buildActor(req)
    expect(actor.username).toBe('SYSTEM')
    expect(actor.role).toBe('SYSTEM')
  })

  it('req.user.role yoksa null döner', () => {
    const req = { user: { username: 'admin' } } as never
    const actor = buildActor(req)
    expect(actor.role).toBeNull()
  })
})

describe('diffFieldsAsChanges — format fonksiyonları', () => {
  const empMap = FIELD_MAPS[AUDIT_ENTITY_TYPE.EMPLOYEE]!
  const settMap = FIELD_MAPS[AUDIT_ENTITY_TYPE.SETTINGS]!

  it('fmtDate: null → tarih değişimini "—" ile gösterir', () => {
    const result = diffFieldsAsChanges({ startDate: null }, { startDate: '2024-01-01' }, empMap)
    expect(result.some(s => s.includes('—'))).toBe(true)
  })

  it('fmtDate: boş string → "—" ile gösterir', () => {
    const result = diffFieldsAsChanges({ endDate: '' }, { endDate: '2024-12-31' }, empMap)
    expect(result.some(s => s.includes('—'))).toBe(true)
  })

  it('fmtDate: geçerli ISO tarih formatlar', () => {
    const result = diffFieldsAsChanges({ startDate: '2024-01-01' }, { startDate: '2024-06-01' }, empMap)
    expect(result.some(s => s.includes('2024-01-01') || s.includes('2024-06'))).toBe(true)
  })

  it('fmtActive: true → "Aktif", false → "Pasif"', () => {
    const result = diffFieldsAsChanges({ isActive: true }, { isActive: false }, empMap)
    expect(result.some(s => s.includes('Aktif') && s.includes('Pasif'))).toBe(true)
  })

  it('fmtActive: null → "—"', () => {
    const result = diffFieldsAsChanges({ isActive: null }, { isActive: true }, empMap)
    expect(result.some(s => s.includes('—'))).toBe(true)
  })

  it('fmtMoney: geçerli sayıyı TL formatında gösterir', () => {
    const result = diffFieldsAsChanges({ dailyWage: 500 }, { dailyWage: 600 }, settMap)
    expect(result.some(s => s.includes('TL'))).toBe(true)
  })

  it('fmtMoney: null → "—"', () => {
    const result = diffFieldsAsChanges({ dailyWage: null }, { dailyWage: 500 }, settMap)
    expect(result.some(s => s.includes('—'))).toBe(true)
  })

  it('fmtMoney: NaN string → olduğu gibi gösterir', () => {
    const result = diffFieldsAsChanges({ dailyWage: 'abc' }, { dailyWage: 500 }, settMap)
    expect(result.length).toBeGreaterThan(0)
  })

  it('valuesEqual: her iki taraf da null ise değişim yok', () => {
    const result = diffFieldsAsChanges({ endDate: null }, { endDate: null }, empMap)
    expect(result).toHaveLength(0)
  })

  it('valuesEqual: Date objeleri aynıysa değişim yok', () => {
    const d = new Date('2024-01-01')
    const result = diffFieldsAsChanges({ startDate: d }, { startDate: new Date('2024-01-01') }, empMap)
    expect(result).toHaveLength(0)
  })

  it('valuesEqual: sayı ve string aynı değeri temsil ediyorsa değişim yok', () => {
    const result = diffFieldsAsChanges({ maxWeeklyDays: 5 }, { maxWeeklyDays: '5' }, settMap)
    expect(result).toHaveLength(0)
  })
})

describe('diffEntityWithLookups', () => {
  it('lookup haritası ile ID yerine isim gösterir', () => {
    const lookups = { unitId: { 'unit-1': 'Bilgi İşlem', 'unit-2': 'İnsan Kaynakları' } }
    const result = diffEntityWithLookups(
      AUDIT_ENTITY_TYPE.EMPLOYEE,
      { unitId: 'unit-1' },
      { unitId: 'unit-2' },
      lookups,
    )
    expect(result.some(s => s.includes('Bilgi İşlem') && s.includes('İnsan Kaynakları'))).toBe(true)
  })

  it('lookup yoksa ham değeri formatlar', () => {
    const result = diffEntityWithLookups(
      AUDIT_ENTITY_TYPE.EMPLOYEE,
      { firstName: 'Ahmet' },
      { firstName: 'Mehmet' },
      {},
    )
    expect(result.some(s => s.includes('Ahmet') && s.includes('Mehmet'))).toBe(true)
  })

  it('bilinmeyen entity tipi için boş array döner', () => {
    const result = diffEntityWithLookups('unknown' as never, { x: 1 }, { x: 2 })
    expect(result).toEqual([])
  })

  it('eksik oldRow veya newRow için boş array döner', () => {
    expect(diffEntityWithLookups(AUDIT_ENTITY_TYPE.EMPLOYEE, null as never, {})).toEqual([])
    expect(diffEntityWithLookups(AUDIT_ENTITY_TYPE.EMPLOYEE, {}, null as never)).toEqual([])
  })
})

describe('truncateChanges', () => {
  it('max\'tan az öğe varsa hepsini döner', () => {
    const items = ['a', 'b', 'c']
    expect(truncateChanges(items, 10)).toEqual(items)
  })

  it('max\'tan fazla öğe varsa truncate eder ve not ekler', () => {
    const items = Array.from({ length: 5 }, (_, i) => `item-${i}`)
    const result = truncateChanges(items, 3)
    expect(result).toHaveLength(4)
    expect(result[3]).toContain('2 kayıt daha')
  })

  it('dizi değilse boş array döner', () => {
    expect(truncateChanges(null as never)).toEqual([])
  })
})
