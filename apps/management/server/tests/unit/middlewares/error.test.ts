import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../../src/utils/logger.js', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { errorMiddleware } from '../../../src/middlewares/errorMiddleware.js'
import { AppError, badRequest, forbidden, notFound } from '../../../src/utils/AppError.js'
import { mockReq, mockRes, mockNext } from '../../helpers/mockRequest.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('errorMiddleware', () => {
  it('AppError için doğru status ve mesaj döner', () => {
    const err = badRequest('Geçersiz veri')
    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    errorMiddleware(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Geçersiz veri' })
  })

  it('403 AppError için doğru status döner', () => {
    const err = forbidden('Erişim reddedildi')
    const req = mockReq()
    const res = mockRes()

    errorMiddleware(err, req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('404 AppError için doğru status döner', () => {
    const err = notFound('Kayıt bulunamadı')
    const req = mockReq()
    const res = mockRes()

    errorMiddleware(err, req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('PG unique violation (23505) için 409 döner', () => {
    const pgErr = { code: '23505', detail: 'duplicate key' }
    const req = mockReq()
    const res = mockRes()

    errorMiddleware(pgErr, req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Bu kayıt zaten mevcut' })
  })

  it('bilinmeyen hata için 500 döner', () => {
    const err = new Error('Beklenmedik hata')
    const req = mockReq()
    const res = mockRes()

    errorMiddleware(err, req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Sunucu hatası' })
  })

  it('string hata için 500 döner', () => {
    const req = mockReq()
    const res = mockRes()

    errorMiddleware('string error', req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('yanıt always success:false içerir', () => {
    const err = new AppError('test', 400)
    const req = mockReq()
    const res = mockRes()

    errorMiddleware(err, req, res, vi.fn())

    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(jsonArg.success).toBe(false)
  })
})

/* Postgres'in operasyonel hata kodları generic "Sunucu hatası"
   yerine kullanıcıya ne yapacağını söyleyen mesajlara çevrilmeli. */
describe('errorMiddleware — operasyonel Postgres hataları', () => {
  it('deadlock (40P01) → 409 ve tekrar deneme mesajı', () => {
    const req = mockReq()
    const res = mockRes()
    const err = Object.assign(new Error('deadlock detected'), { code: '40P01' })

    errorMiddleware(err, req, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(409)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.message).toContain('tekrar deneyin')
  })

  it('statement timeout (57014) → 503', () => {
    const req = mockReq()
    const res = mockRes()
    const err = Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' })

    errorMiddleware(err, req, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(503)
  })

  it('drizzle cause içindeki deadlock da yakalanır', () => {
    const req = mockReq()
    const res = mockRes()
    const err = Object.assign(new Error('query failed'), {
      cause: Object.assign(new Error('deadlock detected'), { code: '40P01' }),
    })

    errorMiddleware(err, req, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  /* Sistem sıfırlama, app_user'ın TRUNCATE yetkisi olmadığı için generic
     "Sunucu hatası" ile 500 dönüyordu; gerçek sebep yalnızca sunucu
     günlüğünde kalıyordu. Bu sınıf hata bir daha gömülmemeli. */
  it('yetki hatası (42501) → anlaşılır 500 mesajı', () => {
    const req = mockReq()
    const res = mockRes()
    const err = Object.assign(new Error('permission denied for table timesheet_days'), { code: '42501' })

    errorMiddleware(err, req, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.message).toContain('Veritabanı yetkisi eksik')
    expect(body.message).toContain('Hiçbir veri değiştirilmedi')
    // Ham Postgres metni (tablo adı) kullanıcıya sızmamalı
    expect(body.message).not.toContain('timesheet_days')
  })

  it('drizzle cause içindeki yetki hatası da yakalanır', () => {
    const req = mockReq()
    const res = mockRes()
    const err = Object.assign(new Error('Failed query'), {
      cause: Object.assign(new Error('permission denied'), { code: '42501' }),
    })

    errorMiddleware(err, req, res, mockNext)

    expect(res.status).toHaveBeenCalledWith(500)
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.message).toContain('Veritabanı yetkisi eksik')
  })
})
