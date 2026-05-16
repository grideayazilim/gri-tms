import { describe, it, expect } from 'vitest'
import { holidayQuerySchema } from '../../src/schemas/holiday.schema.js'

describe('holidayQuerySchema', () => {
  it('geçerli yıl ile başarılı olur', () => {
    const result = holidayQuerySchema.safeParse({ year: 2024 })
    expect(result.success).toBe(true)
  })

  it('string sayı coerce edilir', () => {
    const result = holidayQuerySchema.safeParse({ year: '2024' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.year).toBe(2024)
  })

  it('2000 sınırında başarılı olur', () => {
    const result = holidayQuerySchema.safeParse({ year: 2000 })
    expect(result.success).toBe(true)
  })

  it('2100 sınırında başarılı olur', () => {
    const result = holidayQuerySchema.safeParse({ year: 2100 })
    expect(result.success).toBe(true)
  })

  it('1999 yılı reddeder', () => {
    const result = holidayQuerySchema.safeParse({ year: 1999 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('2000')
  })

  it('2101 yılı reddeder', () => {
    const result = holidayQuerySchema.safeParse({ year: 2101 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('2100')
  })

  it('ondalıklı sayı reddeder (int kontrolü)', () => {
    const result = holidayQuerySchema.safeParse({ year: 2024.5 })
    expect(result.success).toBe(false)
  })

  it('sayısal olmayan string reddeder', () => {
    const result = holidayQuerySchema.safeParse({ year: 'ikibin' })
    expect(result.success).toBe(false)
  })

  it('yıl eksikse reddeder', () => {
    const result = holidayQuerySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
