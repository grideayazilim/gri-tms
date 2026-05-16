import { describe, it, expect } from 'vitest'
import { userEditSchema, profileUpdateSchema } from '../../src/schemas/user.schema.js'

describe('userEditSchema', () => {
  it('tüm alanlar opsiyonel — boş obje ile başarılı olur', () => {
    const result = userEditSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('geçerli rol ile başarılı olur', () => {
    const result = userEditSchema.safeParse({ role: 'ADMIN' })
    expect(result.success).toBe(true)
  })

  it('geçersiz rol reddeder', () => {
    const result = userEditSchema.safeParse({ role: 'GOD' })
    expect(result.success).toBe(false)
  })

  it('geçersiz status reddeder', () => {
    const result = userEditSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('geçerli status değerleri kabul edilir', () => {
    for (const status of ['ACTIVE', 'EXPIRED', 'PENDING']) {
      expect(userEditSchema.safeParse({ status }).success).toBe(true)
    }
  })

  it('RESPONSIBLE rolü için expiryDate, locationId, unitId zorunludur', () => {
    const result = userEditSchema.safeParse({
      role: 'RESPONSIBLE',
      expiryDate: null,
      locationId: null,
      unitId: null,
    })
    expect(result.success).toBe(false)
    const paths = result.error?.issues.map(i => i.path[0])
    expect(paths).toContain('expiryDate')
    expect(paths).toContain('locationId')
    expect(paths).toContain('unitId')
  })

  it('RESPONSIBLE rolü ile tüm alanlar dolu ise başarılı olur', () => {
    const result = userEditSchema.safeParse({
      role: 'RESPONSIBLE',
      expiryDate: '2025-12-31',
      locationId: 'loc-1',
      unitId: 'unit-1',
    })
    expect(result.success).toBe(true)
  })

  it('forceNewPassword 8 karakterden kısa ise reddeder', () => {
    const result = userEditSchema.safeParse({ forceNewPassword: 'short' })
    expect(result.success).toBe(false)
  })

  it('forceNewPassword 128 karakterden uzunsa reddeder', () => {
    const result = userEditSchema.safeParse({ forceNewPassword: 'a'.repeat(129) })
    expect(result.success).toBe(false)
  })
})

describe('profileUpdateSchema', () => {
  it('boş obje ile başarılı olur (tüm alanlar opsiyonel)', () => {
    const result = profileUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('sadece username güncelleme ile başarılı olur', () => {
    const result = profileUpdateSchema.safeParse({ username: 'yenikullanici' })
    expect(result.success).toBe(true)
  })

  it('kullanıcı adı boşluk içeriyorsa reddeder', () => {
    const result = profileUpdateSchema.safeParse({ username: 'yeni kullanici' })
    expect(result.success).toBe(false)
  })

  it('kullanıcı adı 3 karakterden kısaysa reddeder', () => {
    const result = profileUpdateSchema.safeParse({ username: 'ab' })
    expect(result.success).toBe(false)
  })

  it('sadece oldPassword verilirse reddeder', () => {
    const result = profileUpdateSchema.safeParse({ oldPassword: 'current123' })
    expect(result.success).toBe(false)
  })

  it('sadece newPassword verilirse reddeder', () => {
    const result = profileUpdateSchema.safeParse({ newPassword: 'newpass123' })
    expect(result.success).toBe(false)
  })

  it('hem oldPassword hem newPassword verilirse başarılı olur', () => {
    const result = profileUpdateSchema.safeParse({
      oldPassword: 'current123',
      newPassword: 'newpass123',
    })
    expect(result.success).toBe(true)
  })

  it('newPassword 8 karakterden kısaysa reddeder', () => {
    const result = profileUpdateSchema.safeParse({
      oldPassword: 'current123',
      newPassword: 'short',
    })
    expect(result.success).toBe(false)
  })
})
