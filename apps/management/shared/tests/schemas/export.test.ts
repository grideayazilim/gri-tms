import { describe, it, expect } from 'vitest'
import { exportQuerySchema } from '../../src/schemas/export.schema.js'

const validQuery = {
  locationId: 'loc-uuid-123',
  year: 2024,
  month: 6,
}

describe('exportQuerySchema', () => {
  it('geçerli sorgu ile başarılı olur', () => {
    const result = exportQuerySchema.safeParse(validQuery)
    expect(result.success).toBe(true)
  })

  it('string yıl ve ay coerce edilir', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, year: '2024', month: '6' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.year).toBe(2024)
      expect(result.data.month).toBe(6)
    }
  })

  it('boş locationId reddeder', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, locationId: '' })
    expect(result.success).toBe(false)
  })

  it('1999 yılı reddeder', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, year: 1999 })
    expect(result.success).toBe(false)
  })

  it('ay 0 ise reddeder', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, month: 0 })
    expect(result.success).toBe(false)
  })

  it('ay 13 ise reddeder', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, month: 13 })
    expect(result.success).toBe(false)
  })

  it('ay 1 ile başarılı olur', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, month: 1 })
    expect(result.success).toBe(true)
  })

  it('ay 12 ile başarılı olur', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, month: 12 })
    expect(result.success).toBe(true)
  })

  it('ondalıklı yıl reddeder', () => {
    const result = exportQuerySchema.safeParse({ ...validQuery, year: 2024.5 })
    expect(result.success).toBe(false)
  })
})
