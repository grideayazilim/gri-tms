import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { validate } from '../../../src/middlewares/validate.js'
import { mockReq, mockRes } from '../../helpers/mockRequest.js'

const schema = z.object({
  name: z.string().min(1, 'Ad zorunludur'),
  age: z.number().min(0, 'Yaş geçersiz'),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('validate middleware', () => {
  it('geçerli body ile req.body güncellenir ve next() çağrılır', () => {
    const req = mockReq({ body: { name: 'Ahmet', age: 25 } })
    const res = mockRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ name: 'Ahmet', age: 25 })
  })

  it('geçersiz body için 400 döner ve next() çağrılmaz', () => {
    const req = mockReq({ body: { name: '', age: 25 } })
    const res = mockRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  it('400 yanıtında fieldErrors bulunur', () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(jsonArg.errors).toBeDefined()
  })

  it('target=query ile query parametresini doğrular', () => {
    const querySchema = z.object({ page: z.coerce.number() })
    const req = mockReq({ query: { page: '2' } })
    const res = mockRes()
    const next = vi.fn()

    validate(querySchema, 'query')(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('target=query ile geçersiz query 400 döner', () => {
    const querySchema = z.object({ page: z.number().min(1) })
    const req = mockReq({ query: { page: 'abc' } })
    const res = mockRes()
    const next = vi.fn()

    validate(querySchema, 'query')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('hata mesajında ilk Zod hata mesajı kullanılır', () => {
    const req = mockReq({ body: { name: '', age: 25 } })
    const res = mockRes()
    const next = vi.fn()

    validate(schema)(req, res, next)

    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(jsonArg.message).toBe('Ad zorunludur')
  })

  it('body transform ile dönüştürülmüş veri req.body\'ye yazılır', () => {
    const trimSchema = z.object({ name: z.string().trim() })
    const req = mockReq({ body: { name: '  Ahmet  ' } })
    const res = mockRes()
    const next = vi.fn()

    validate(trimSchema)(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body.name).toBe('Ahmet')
  })
})
