import { describe, it, expect } from 'vitest'
import { employeeSchema } from '../../src/schemas/employee.schema.js'

const validEmployee = {
  tcNo: '12345678901',
  firstName: 'Ahmet',
  lastName: 'Yılmaz',
  locationId: 'loc-1',
  unitId: 'unit-1',
  startDate: '2024-01-01',
  endDate: null,
  ibanNo: 'TR' + '1'.repeat(24),
  isActive: true,
}

describe('employeeSchema', () => {
  it('geçerli çalışan ile başarılı olur', () => {
    const result = employeeSchema.safeParse(validEmployee)
    expect(result.success).toBe(true)
  })

  it('TC No 11 hane değilse reddeder', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, tcNo: '123456789' })
    expect(result.success).toBe(false)
  })

  it('TC No harf içerirse reddeder', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, tcNo: '1234567890a' })
    expect(result.success).toBe(false)
  })

  it('IBAN TR ile başlamıyorsa reddeder', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, ibanNo: 'DE' + '1'.repeat(24) })
    expect(result.success).toBe(false)
  })

  it('IBAN 26 hane değilse reddeder', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, ibanNo: 'TR' + '1'.repeat(20) })
    expect(result.success).toBe(false)
  })

  it('IBAN TR + 24 rakam ile başarılı olur', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, ibanNo: 'TR' + '9'.repeat(24) })
    expect(result.success).toBe(true)
  })

  it('startDate yanlış formatta reddeder', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, startDate: '01-01-2024' })
    expect(result.success).toBe(false)
  })

  it('endDate boş string null\'a dönüştürülür', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, endDate: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.endDate).toBeNull()
  })

  it('zorunlu firstName eksikse reddeder', () => {
    const result = employeeSchema.safeParse({ ...validEmployee, firstName: '' })
    expect(result.success).toBe(false)
  })

  it('isActive varsayılan true olmalı', () => {
    const { isActive: _, ...rest } = validEmployee
    const result = employeeSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isActive).toBe(true)
  })
})
