import { describe, it, expect } from 'vitest'
import { signInSchema, signUpSchema, initialPasswordSchema } from '../../src/schemas/auth.schema.js'

describe('signInSchema', () => {
  it('geçerli giriş verisi ile başarılı olur', () => {
    const result = signInSchema.safeParse({ username: 'admin', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('boş kullanıcı adı reddeder', () => {
    const result = signInSchema.safeParse({ username: '', password: 'secret123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some(i => i.path.includes('username'))).toBe(true)
  })

  it('boş şifre reddeder', () => {
    const result = signInSchema.safeParse({ username: 'admin', password: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some(i => i.path.includes('password'))).toBe(true)
  })

  it('rememberMe varsayılan değeri false olmalı', () => {
    const result = signInSchema.safeParse({ username: 'admin', password: 'pass' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.rememberMe).toBe(false)
  })

  it('boşluklu kullanıcı adını trim eder', () => {
    const result = signInSchema.safeParse({ username: '  admin  ', password: 'pass' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.username).toBe('admin')
  })

  it('eksik alanlar ile reddeder', () => {
    const result = signInSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('signUpSchema', () => {
  const validAdmin = {
    username: 'adminuser',
    password: 'password123',
    role: 'ADMIN',
    locationId: null,
    unitId: null,
  }

  it('geçerli ADMIN kullanıcısı ile başarılı olur', () => {
    const result = signUpSchema.safeParse(validAdmin)
    expect(result.success).toBe(true)
  })

  it('3 karakterden kısa kullanıcı adı reddeder', () => {
    const result = signUpSchema.safeParse({ ...validAdmin, username: 'ab' })
    expect(result.success).toBe(false)
  })

  // Şifre politikası: en az 10 karakter
  it('10 karakterden kısa şifre reddeder', () => {
    const result = signUpSchema.safeParse({ ...validAdmin, password: 'sifre1234' })
    expect(result.success).toBe(false)
  })

  it('sadece rakamlardan oluşan şifre reddeder', () => {
    const result = signUpSchema.safeParse({ ...validAdmin, password: '12345678901' })
    expect(result.success).toBe(false)
  })

  it('yaygın şifreleri reddeder', () => {
    const result = signUpSchema.safeParse({ ...validAdmin, password: 'qwertyuiop' })
    expect(result.success).toBe(false)
  })

  it('128 karakterden uzun şifre reddeder', () => {
    const result = signUpSchema.safeParse({ ...validAdmin, password: 'a'.repeat(129) })
    expect(result.success).toBe(false)
  })

  it('boşluk içeren kullanıcı adı reddeder', () => {
    const result = signUpSchema.safeParse({ ...validAdmin, username: 'user name' })
    expect(result.success).toBe(false)
  })

  it('geçersiz rol reddeder', () => {
    const result = signUpSchema.safeParse({ ...validAdmin, role: 'SUPERUSER' })
    expect(result.success).toBe(false)
  })

  it('RESPONSIBLE rolü için locationId ve unitId zorunludur', () => {
    const result = signUpSchema.safeParse({
      username: 'responsible',
      password: 'password123',
      role: 'RESPONSIBLE',
      locationId: null,
      unitId: null,
    })
    expect(result.success).toBe(false)
    const paths = result.error?.issues.map(i => i.path[0])
    expect(paths).toContain('locationId')
    expect(paths).toContain('unitId')
  })

  it('RESPONSIBLE rolü ile geçerli UUID verilirse başarılı olur', () => {
    const result = signUpSchema.safeParse({
      username: 'responsible',
      password: 'password123',
      role: 'RESPONSIBLE',
      locationId: '550e8400-e29b-41d4-a716-446655440000',
      unitId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(true)
  })

  it('geçersiz UUID formatı reddeder', () => {
    const result = signUpSchema.safeParse({
      ...validAdmin,
      role: 'RESPONSIBLE',
      locationId: 'not-a-uuid',
      unitId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.success).toBe(false)
  })
})

describe('initialPasswordSchema (zorunlu şifre değişimi)', () => {
  it('eşleşen ve politikaya uyan şifre ile başarılı olur', () => {
    const result = initialPasswordSchema.safeParse({
      newPassword: 'Guclu-Sifre-2026',
      newPasswordConfirm: 'Guclu-Sifre-2026',
    })
    expect(result.success).toBe(true)
  })

  it('şifreler eşleşmiyorsa reddeder', () => {
    const result = initialPasswordSchema.safeParse({
      newPassword: 'Guclu-Sifre-2026',
      newPasswordConfirm: 'Baska-Sifre-2026',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('newPasswordConfirm'))).toBe(true)
    }
  })

  it('10 karakterden kısa şifre reddeder', () => {
    const result = initialPasswordSchema.safeParse({
      newPassword: 'kisa12',
      newPasswordConfirm: 'kisa12',
    })
    expect(result.success).toBe(false)
  })

  it('varsayılan 1234 gibi zayıf şifreyi reddeder', () => {
    const result = initialPasswordSchema.safeParse({
      newPassword: '1234',
      newPasswordConfirm: '1234',
    })
    expect(result.success).toBe(false)
  })
})
