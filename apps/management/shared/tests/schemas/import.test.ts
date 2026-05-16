import { describe, it, expect } from 'vitest'
import { importEmployeeSchema, importFinalizeSchema, bulkImportEmployeesSchema } from '../../src/schemas/import.schema.js'

describe('importEmployeeSchema', () => {
  const validImport = {
    tcNo: '12345678901',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    locationId: 'loc-1',
    year: 2024,
    month: 6,
  }

  it('geçerli veri ile başarılı olur', () => {
    const result = importEmployeeSchema.safeParse(validImport)
    expect(result.success).toBe(true)
  })

  it('TC No 11 hane değilse reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, tcNo: '1234' })
    expect(result.success).toBe(false)
  })

  it('TC No harf içerirse reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, tcNo: '1234567890a' })
    expect(result.success).toBe(false)
  })

  it('geçerli IBAN ile başarılı olur', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, ibanNo: 'TR' + '1'.repeat(24) })
    expect(result.success).toBe(true)
  })

  it('geçersiz IBAN reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, ibanNo: 'DE123' })
    expect(result.success).toBe(false)
  })

  it('ay 13 ise reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, month: 13 })
    expect(result.success).toBe(false)
  })

  it('markers record opsiyonel', () => {
    const result = importEmployeeSchema.safeParse({
      ...validImport,
      markers: { '2024-06-01': 'X', '2024-06-02': 'R' },
    })
    expect(result.success).toBe(true)
  })
})

describe('importFinalizeSchema', () => {
  const valid = {
    locationName: 'Merkez Yerleşke',
    year: 2024,
    month: 6,
  }

  it('geçerli veri ile başarılı olur', () => {
    const result = importFinalizeSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('boş locationName reddeder', () => {
    const result = importFinalizeSchema.safeParse({ ...valid, locationName: '' })
    expect(result.success).toBe(false)
  })

  it('timesheetChanges varsayılan boş dizi', () => {
    const result = importFinalizeSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.timesheetChanges).toEqual([])
  })

  it('geçerli timesheetChanges ile başarılı olur', () => {
    const result = importFinalizeSchema.safeParse({
      ...valid,
      timesheetChanges: [{ name: 'Ahmet Yılmaz', daysCount: 20 }],
    })
    expect(result.success).toBe(true)
  })
})

describe('bulkImportEmployeesSchema', () => {
  it('geçerli toplu veri ile başarılı olur', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{ tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez' }],
    })
    expect(result.success).toBe(true)
  })

  it('boş employees dizisi kabul edilir', () => {
    const result = bulkImportEmployeesSchema.safeParse({ employees: [] })
    expect(result.success).toBe(true)
  })

  it('tcNo eksikse reddeder', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{ fullName: 'Ahmet', locationName: 'Merkez' }],
    })
    expect(result.success).toBe(false)
  })
})
