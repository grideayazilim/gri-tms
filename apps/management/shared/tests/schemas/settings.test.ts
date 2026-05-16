import { describe, it, expect } from 'vitest'
import { loginSettingsSchema, systemSettingsSchema } from '../../src/schemas/settings.schema.js'

describe('loginSettingsSchema', () => {
  const validLogin = {
    username: 'adminuser',
    currentPassword: '',
  }

  it('geçerli kullanıcı adı ile başarılı olur', () => {
    const result = loginSettingsSchema.safeParse(validLogin)
    expect(result.success).toBe(true)
  })

  it('boş kullanıcı adı reddeder', () => {
    const result = loginSettingsSchema.safeParse({ ...validLogin, username: '' })
    expect(result.success).toBe(false)
  })

  it('boşluk içeren kullanıcı adı reddeder', () => {
    const result = loginSettingsSchema.safeParse({ ...validLogin, username: 'admin user' })
    expect(result.success).toBe(false)
  })

  it('boş string şifresi undefined\'a dönüştürülür (preprocess)', () => {
    const result = loginSettingsSchema.safeParse({ ...validLogin, password: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.password).toBeUndefined()
  })

  it('yeni şifre girildiğinde currentPassword zorunludur', () => {
    const result = loginSettingsSchema.safeParse({
      username: 'admin',
      currentPassword: '',
      password: 'newpassword123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some(i => i.path.includes('currentPassword'))).toBe(true)
  })

  it('hem currentPassword hem password verilirse başarılı olur', () => {
    const result = loginSettingsSchema.safeParse({
      username: 'admin',
      currentPassword: 'oldpass123',
      password: 'newpass123',
    })
    expect(result.success).toBe(true)
  })

  it('yeni şifre 8 karakterden kısaysa reddeder', () => {
    const result = loginSettingsSchema.safeParse({
      username: 'admin',
      currentPassword: 'oldpass',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })
})

describe('systemSettingsSchema', () => {
  const validSystem = {
    dailyWage: 500,
    maxWeeklyDays: 5,
    programStartDate: '2024-01-01',
    programEndDate: '2024-12-31',
  }

  it('geçerli sistem ayarları ile başarılı olur', () => {
    const result = systemSettingsSchema.safeParse(validSystem)
    expect(result.success).toBe(true)
  })

  it('boş string dailyWage null\'a dönüştürülür', () => {
    const result = systemSettingsSchema.safeParse({ ...validSystem, dailyWage: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.dailyWage).toBeNull()
  })

  it('boş string maxWeeklyDays null\'a dönüştürülür', () => {
    const result = systemSettingsSchema.safeParse({ ...validSystem, maxWeeklyDays: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.maxWeeklyDays).toBeNull()
  })

  it('programStartDate yanlış formatta reddeder', () => {
    const result = systemSettingsSchema.safeParse({ ...validSystem, programStartDate: '01/01/2024' })
    expect(result.success).toBe(false)
  })

  it('programEndDate yanlış formatta reddeder', () => {
    const result = systemSettingsSchema.safeParse({ ...validSystem, programEndDate: '31.12.2024' })
    expect(result.success).toBe(false)
  })

  it('boş tarih string kabul edilir (or literal)', () => {
    const result = systemSettingsSchema.safeParse({ ...validSystem, programStartDate: '' })
    expect(result.success).toBe(true)
  })
})
