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

  it('yeni şifre politikadan kısaysa reddeder', () => {
    const result = loginSettingsSchema.safeParse({
      username: 'admin',
      currentPassword: 'oldpass',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  /* Bu alan ortak passwordPolicy'yi kullanmalı (min 10 + "sadece rakam olamaz"
     + yaygın şifre yasağı). Kendi `min(8)` kuralını kullansaydı kullanıcı forma
     göre doğru davrandığı hâlde sunucudan hata alırdı. */
  describe('ortak şifre politikası', () => {
    const withPassword = (password: string) =>
      loginSettingsSchema.safeParse({ username: 'admin', currentPassword: 'oldpass', password })

    it("'12345678' reddedilir (8 karakter, politika 10 istiyor)", () => {
      const result = withPassword('12345678')
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('10 karakter')
    })

    it('10 karakterli ama sadece rakamdan oluşan şifre reddedilir', () => {
      const result = withPassword('1234567890')
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('sadece rakamlardan')
    })

    it('yaygın şifre reddedilir', () => {
      expect(withPassword('qwertyuiop').success).toBe(false)
    })

    it('10+ karakterli karışık şifre geçer', () => {
      expect(withPassword('Karisik123abc').success).toBe(true)
    })
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

  /* `.min(0)` günlük ödeneğin 0 kaydedilmesine izin verir ve tüm maaş çıktıları
     sessizce 0 TL üretir. Bu şema sıfırlama formuyla (reset.schema.ts) hizalıdır:
     null serbest, 0 reddedilir. */
  describe('sıfır ödenek reddi', () => {
    it('dailyWage: 0 reddedilir', () => {
      const result = systemSettingsSchema.safeParse({ ...validSystem, dailyWage: 0 })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('sıfırdan büyük')
    })

    it('maxWeeklyDays: 0 reddedilir', () => {
      const result = systemSettingsSchema.safeParse({ ...validSystem, maxWeeklyDays: 0 })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toContain('sıfırdan büyük')
    })

    it('negatif dailyWage reddedilir', () => {
      expect(systemSettingsSchema.safeParse({ ...validSystem, dailyWage: -5 }).success).toBe(false)
    })

    it("null (henüz ayarlanmamış) geçer", () => {
      const result = systemSettingsSchema.safeParse({ ...validSystem, dailyWage: '', maxWeeklyDays: '' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.dailyWage).toBeNull()
        expect(result.data.maxWeeklyDays).toBeNull()
      }
    })

    it('150 geçer', () => {
      const result = systemSettingsSchema.safeParse({ ...validSystem, dailyWage: 150 })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.dailyWage).toBe(150)
    })
  })
})
