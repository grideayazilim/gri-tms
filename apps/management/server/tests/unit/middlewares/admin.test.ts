import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminMiddleware } from '../../../src/middlewares/adminMiddleware.js'
import { AppError } from '../../../src/utils/AppError.js'
import { mockReq, mockRes } from '../../helpers/mockRequest.js'
import { makeUser } from '../../helpers/testFactory.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('adminMiddleware', () => {
  it('ADMIN rolü ile next() çağrılır', () => {
    const req = mockReq({ user: makeUser({ role: 'ADMIN' }) })
    const res = mockRes()
    const next = vi.fn()

    adminMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('RESPONSIBLE rolü ile AppError (403) fırlatır', () => {
    const req = mockReq({ user: makeUser({ role: 'RESPONSIBLE' }) })
    const res = mockRes()
    const next = vi.fn()

    expect(() => adminMiddleware(req, res, next)).toThrow(AppError)
    try {
      adminMiddleware(req, res, next)
    } catch (err) {
      expect((err as AppError).status).toBe(403)
    }
  })

  it('req.user yok ise AppError (403) fırlatır', () => {
    const req = mockReq({ user: undefined })
    const res = mockRes()
    const next = vi.fn()

    expect(() => adminMiddleware(req, res, next)).toThrow(AppError)
  })

  it('hata next\'e iletilmez — throw ile fırlatılır', () => {
    const req = mockReq({ user: makeUser({ role: 'RESPONSIBLE' }) })
    const res = mockRes()
    const next = vi.fn()

    expect(() => adminMiddleware(req, res, next)).toThrow()
    expect(next).not.toHaveBeenCalled()
  })

  it('ADMIN olmayan herhangi bir rol 403 fırlatır', () => {
    const req = mockReq({ user: { ...makeUser(), role: 'UNKNOWN' as never } })
    const res = mockRes()
    const next = vi.fn()

    expect(() => adminMiddleware(req, res, next)).toThrow(AppError)
  })
})
