import { describe, it, expect } from 'vitest'
import { normalizePhone } from '../../src/utils/phoneUtils.js'

describe('normalizePhone', () => {
  it('"05551234455" → "0555 123 4455"', () => {
    expect(normalizePhone('05551234455')).toBe('0555 123 4455')
  })

  it('"+905551234455" → "0555 123 4455"', () => {
    expect(normalizePhone('+905551234455')).toBe('0555 123 4455')
  })

  it('"905551234455" → "0555 123 4455"', () => {
    expect(normalizePhone('905551234455')).toBe('0555 123 4455')
  })

  it('"5551234455" → "0555 123 4455"', () => {
    expect(normalizePhone('5551234455')).toBe('0555 123 4455')
  })

  it('"0555 123 4455" (zaten formatlı) → "0555 123 4455"', () => {
    expect(normalizePhone('0555 123 4455')).toBe('0555 123 4455')
  })

  it('"0 555 123 44 55" (farklı boşluklar) → "0555 123 4455"', () => {
    expect(normalizePhone('0 555 123 44 55')).toBe('0555 123 4455')
  })

  it('"(0555) 123-4455" (parantez/tire) → "0555 123 4455"', () => {
    expect(normalizePhone('(0555) 123-4455')).toBe('0555 123 4455')
  })

  it('"1234567890" (5 ile başlamıyor) → null', () => {
    expect(normalizePhone('1234567890')).toBeNull()
  })

  it('"0312 123 4455" (sabit hat) → null', () => {
    expect(normalizePhone('0312 123 4455')).toBeNull()
  })

  it('"055512344" (eksik hane) → null', () => {
    expect(normalizePhone('055512344')).toBeNull()
  })

  it('"" (boş string) → null', () => {
    expect(normalizePhone('')).toBeNull()
  })

  it('"abc" (harf) → null', () => {
    expect(normalizePhone('abc')).toBeNull()
  })
})
