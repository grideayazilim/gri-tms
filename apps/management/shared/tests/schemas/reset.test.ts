import { describe, it, expect } from 'vitest'
import { systemResetSchema } from '../../src/schemas/reset.schema.js'

const validReset = {
  backup: true,
  deleteLocationsAndUnits: false,
  newSettings: {
    dailyWage: 500,
    maxWeeklyDays: 5,
    programStartDate: '2024-01-01',
    programEndDate: '2024-12-31',
  },
}

describe('systemResetSchema', () => {
  it('geçerli reset verisi ile başarılı olur', () => {
    const result = systemResetSchema.safeParse(validReset)
    expect(result.success).toBe(true)
  })

  it('backup boolean zorunludur', () => {
    const { backup: _, ...rest } = validReset
    const result = systemResetSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('endDate başlangıçtan önce ise reddeder', () => {
    const result = systemResetSchema.safeParse({
      ...validReset,
      newSettings: {
        ...validReset.newSettings,
        programStartDate: '2024-12-31',
        programEndDate: '2024-01-01',
      },
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some(i => i.path.includes('programEndDate'))).toBe(true)
  })

  it('aynı başlangıç ve bitiş tarihi reddeder', () => {
    const result = systemResetSchema.safeParse({
      ...validReset,
      newSettings: {
        ...validReset.newSettings,
        programStartDate: '2024-06-01',
        programEndDate: '2024-06-01',
      },
    })
    expect(result.success).toBe(false)
  })

  it('günlük ücret sıfır veya negatifse reddeder', () => {
    const result = systemResetSchema.safeParse({
      ...validReset,
      newSettings: { ...validReset.newSettings, dailyWage: 0 },
    })
    expect(result.success).toBe(false)
  })

  it('maxWeeklyDays sıfır veya negatifse reddeder', () => {
    const result = systemResetSchema.safeParse({
      ...validReset,
      newSettings: { ...validReset.newSettings, maxWeeklyDays: 0 },
    })
    expect(result.success).toBe(false)
  })

  it('maxWeeklyDays ondalıklı ise reddeder', () => {
    const result = systemResetSchema.safeParse({
      ...validReset,
      newSettings: { ...validReset.newSettings, maxWeeklyDays: 4.5 },
    })
    expect(result.success).toBe(false)
  })

  it('tarih YYYY-MM-DD formatında değilse reddeder', () => {
    const result = systemResetSchema.safeParse({
      ...validReset,
      newSettings: { ...validReset.newSettings, programStartDate: '2024/01/01' },
    })
    expect(result.success).toBe(false)
  })

  it('yıl geçişinde (2024→2025) başarılı olur', () => {
    const result = systemResetSchema.safeParse({
      ...validReset,
      newSettings: { ...validReset.newSettings, programStartDate: '2024-10-01', programEndDate: '2025-03-31' },
    })
    expect(result.success).toBe(true)
  })
})
