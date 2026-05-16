import { describe, it, expect } from 'vitest'
import { auditLogQuerySchema } from '../../src/schemas/auditLog.schema.js'
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_CATEGORIES } from '../../src/constants/auditEventTypes.js'

describe('auditLogQuerySchema', () => {
  it('tüm alanlar opsiyonel — boş obje ile başarılı olur', () => {
    const result = auditLogQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('geçerli action değeri ile başarılı olur', () => {
    const result = auditLogQuerySchema.safeParse({ action: AUDIT_ACTION.USER_LOGIN })
    expect(result.success).toBe(true)
  })

  it('geçersiz action değeri reddeder', () => {
    const result = auditLogQuerySchema.safeParse({ action: 'NONEXISTENT_ACTION' })
    expect(result.success).toBe(false)
  })

  it('geçerli category değeri ile başarılı olur', () => {
    const validCategory = Object.keys(AUDIT_CATEGORIES)[0]
    const result = auditLogQuerySchema.safeParse({ category: validCategory })
    expect(result.success).toBe(true)
  })

  it('geçersiz category değeri reddeder', () => {
    const result = auditLogQuerySchema.safeParse({ category: 'INVALID_CATEGORY' })
    expect(result.success).toBe(false)
  })

  it('geçerli entityType ile başarılı olur', () => {
    const result = auditLogQuerySchema.safeParse({ entityType: AUDIT_ENTITY_TYPE.USER })
    expect(result.success).toBe(true)
  })

  it('geçersiz entityType reddeder', () => {
    const result = auditLogQuerySchema.safeParse({ entityType: 'invalid_entity' })
    expect(result.success).toBe(false)
  })

  it('string page coerce edilir ve minimum 1 uygulanır', () => {
    const result = auditLogQuerySchema.safeParse({ page: '0' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBeGreaterThanOrEqual(1)
  })

  it('string limit coerce edilir ve 1-100 aralığında sınırlanır', () => {
    const result = auditLogQuerySchema.safeParse({ limit: '200' })
    expect(result.success).toBe(false)
  })

  it('tüm geçerli alanlar ile başarılı olur', () => {
    const result = auditLogQuerySchema.safeParse({
      actor: 'adminuser',
      action: AUDIT_ACTION.USER_CREATE,
      entityType: AUDIT_ENTITY_TYPE.USER,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      page: '1',
      limit: '50',
    })
    expect(result.success).toBe(true)
  })
})
