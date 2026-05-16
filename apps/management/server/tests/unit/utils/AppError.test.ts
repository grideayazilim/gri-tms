import { describe, it, expect } from 'vitest'
import {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  locked,
  rethrowIfNotUniqueViolation,
} from '../../../src/utils/AppError.js'

describe('AppError', () => {
  it('doğru status ve mesajla oluşturulur', () => {
    const err = new AppError('Test hatası', 400)
    expect(err.message).toBe('Test hatası')
    expect(err.status).toBe(400)
    expect(err.name).toBe('AppError')
  })

  it('varsayılan status 500\'dür', () => {
    const err = new AppError('Hata')
    expect(err.status).toBe(500)
  })

  it('Error sınıfından türer', () => {
    const err = new AppError('Hata', 400)
    expect(err instanceof Error).toBe(true)
    expect(err instanceof AppError).toBe(true)
  })

  it('stack trace içerir', () => {
    const err = new AppError('Hata', 400)
    expect(err.stack).toBeDefined()
  })
})

describe('Hata factory fonksiyonları', () => {
  it('badRequest → 400', () => {
    const err = badRequest('Geçersiz veri')
    expect(err.status).toBe(400)
    expect(err.message).toBe('Geçersiz veri')
  })

  it('unauthorized → 401 (varsayılan mesaj)', () => {
    const err = unauthorized()
    expect(err.status).toBe(401)
    expect(err.message).toBe('Yetkisiz erişim')
  })

  it('unauthorized → 401 (özel mesaj)', () => {
    const err = unauthorized('Lütfen giriş yapın')
    expect(err.status).toBe(401)
    expect(err.message).toBe('Lütfen giriş yapın')
  })

  it('forbidden → 403', () => {
    const err = forbidden()
    expect(err.status).toBe(403)
  })

  it('notFound → 404', () => {
    const err = notFound()
    expect(err.status).toBe(404)
  })

  it('conflict → 409', () => {
    const err = conflict()
    expect(err.status).toBe(409)
  })

  it('locked → 423', () => {
    const err = locked()
    expect(err.status).toBe(423)
  })
})

describe('rethrowIfNotUniqueViolation', () => {
  it('PG unique violation (23505) ise conflict hatası fırlatır', () => {
    const pgError = { code: '23505', detail: 'Key already exists' }
    expect(() => rethrowIfNotUniqueViolation(pgError, 'Kayıt mevcut')).toThrow(AppError)
    try {
      rethrowIfNotUniqueViolation(pgError, 'Kayıt mevcut')
    } catch (err) {
      expect((err as AppError).status).toBe(409)
      expect((err as AppError).message).toBe('Kayıt mevcut')
    }
  })

  it('farklı PG hata kodu ise aynı hatayı yeniden fırlatır', () => {
    const pgError = { code: '23503', detail: 'Foreign key violation' }
    expect(() => rethrowIfNotUniqueViolation(pgError, 'Kayıt mevcut')).toThrow()
    try {
      rethrowIfNotUniqueViolation(pgError, 'Kayıt mevcut')
    } catch (err) {
      expect(err).toBe(pgError) // aynı obje
    }
  })

  it('standart Error ise yeniden fırlatır', () => {
    const error = new Error('DB bağlantı hatası')
    expect(() => rethrowIfNotUniqueViolation(error, 'Kayıt mevcut')).toThrow('DB bağlantı hatası')
  })

  it('code alanı olmayan obje ise yeniden fırlatır', () => {
    const error = { message: 'no code' }
    expect(() => rethrowIfNotUniqueViolation(error, 'msg')).toThrow()
  })

  it('null hata ise yeniden fırlatır', () => {
    expect(() => rethrowIfNotUniqueViolation(null, 'msg')).toThrow()
  })
})
