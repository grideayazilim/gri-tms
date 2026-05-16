import { describe, it, expect } from 'vitest'
import { timesheetDaySchema, timesheetRowSchema, timesheetSaveSchema } from '../../src/schemas/timesheet.schema.js'

describe('timesheetDaySchema', () => {
  it('geçerli gün verisi ile başarılı olur', () => {
    const result = timesheetDaySchema.safeParse({ day: '2024-01-15', markerCode: 'X' })
    expect(result.success).toBe(true)
  })

  it('yanlış tarih formatı reddeder', () => {
    const result = timesheetDaySchema.safeParse({ day: '15-01-2024', markerCode: 'X' })
    expect(result.success).toBe(false)
  })

  it('sadece yıl-ay formatı reddeder', () => {
    const result = timesheetDaySchema.safeParse({ day: '2024-01', markerCode: 'X' })
    expect(result.success).toBe(false)
  })

  it('geçersiz markerCode reddeder', () => {
    const result = timesheetDaySchema.safeParse({ day: '2024-01-15', markerCode: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('tüm geçerli markerCode değerleri kabul edilir', () => {
    const codes = ['X', 'İ', 'DT', 'R', 'RT']
    for (const code of codes) {
      const result = timesheetDaySchema.safeParse({ day: '2024-01-15', markerCode: code })
      expect(result.success, `markerCode '${code}' başarısız oldu`).toBe(true)
    }
  })

  it('note alanı opsiyonel ve null olabilir', () => {
    const result = timesheetDaySchema.safeParse({ day: '2024-01-15', markerCode: 'X', note: null })
    expect(result.success).toBe(true)
  })
})

describe('timesheetRowSchema', () => {
  it('geçerli satır ile başarılı olur', () => {
    const result = timesheetRowSchema.safeParse({
      employeeId: 'emp-123',
      days: [{ day: '2024-01-15', markerCode: 'X' }],
    })
    expect(result.success).toBe(true)
  })

  it('boş employeeId reddeder', () => {
    const result = timesheetRowSchema.safeParse({ employeeId: '', days: [] })
    expect(result.success).toBe(false)
  })

  it('boş days dizisi kabul edilir', () => {
    const result = timesheetRowSchema.safeParse({ employeeId: 'emp-1', days: [] })
    expect(result.success).toBe(true)
  })
})

describe('timesheetSaveSchema', () => {
  const validSave = {
    periodId: 'period-123',
    timesheets: [{ employeeId: 'emp-1', days: [{ day: '2024-01-15', markerCode: 'X' }] }],
  }

  it('geçerli kaydetme verisi ile başarılı olur', () => {
    const result = timesheetSaveSchema.safeParse(validSave)
    expect(result.success).toBe(true)
  })

  it('boş periodId reddeder', () => {
    const result = timesheetSaveSchema.safeParse({ ...validSave, periodId: '' })
    expect(result.success).toBe(false)
  })

  it('boş timesheets dizisi reddeder', () => {
    const result = timesheetSaveSchema.safeParse({ ...validSave, timesheets: [] })
    expect(result.success).toBe(false)
  })

  it('geçersiz iç timesheet yapısı reddeder', () => {
    const result = timesheetSaveSchema.safeParse({
      periodId: 'p1',
      timesheets: [{ employeeId: '', days: [] }],
    })
    expect(result.success).toBe(false)
  })
})
