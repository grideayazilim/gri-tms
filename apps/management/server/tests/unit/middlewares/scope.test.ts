import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scopeMiddleware } from '../../../src/middlewares/scopeMiddleware.js'
import { AppError } from '../../../src/utils/AppError.js'
import { mockReq, mockRes } from '../../helpers/mockRequest.js'
import { makeUser } from '../../helpers/testFactory.js'

beforeEach(() => {
  vi.clearAllMocks()
})

const locId = '550e8400-e29b-41d4-a716-000000000001'
const unitId = '550e8400-e29b-41d4-a716-000000000002'

describe('scopeMiddleware', () => {
  it('ADMIN + query parametresi ile scope set edilir', () => {
    const req = mockReq({
      user: makeUser({ role: 'ADMIN' }),
      query: { unitId, locationId: locId },
    })
    const res = mockRes()
    const next = vi.fn()

    scopeMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.scope).toEqual({ unitId, locationId: locId })
  })

  it('ADMIN + query parametresi yok ise scope=null (full access)', () => {
    const req = mockReq({
      user: makeUser({ role: 'ADMIN' }),
      query: {},
    })
    const res = mockRes()
    const next = vi.fn()

    scopeMiddleware(req, res, next)

    expect(req.scope).toBeNull()
    expect(next).toHaveBeenCalledOnce()
  })

  it('ADMIN + sadece unitId varsa scope=null', () => {
    const req = mockReq({
      user: makeUser({ role: 'ADMIN' }),
      query: { unitId },
    })
    const res = mockRes()
    const next = vi.fn()

    scopeMiddleware(req, res, next)

    expect(req.scope).toBeNull()
  })

  it('RESPONSIBLE rolü kendi scope\'una kilitlenir', () => {
    const req = mockReq({
      user: makeUser({ role: 'RESPONSIBLE', unitId, locationId: locId }),
    })
    const res = mockRes()
    const next = vi.fn()

    scopeMiddleware(req, res, next)

    expect(req.scope).toEqual({ unitId, locationId: locId })
    expect(next).toHaveBeenCalledOnce()
  })

  it('RESPONSIBLE + unitId/locationId eksikse AppError (403) fırlatır', () => {
    const req = mockReq({
      user: makeUser({ role: 'RESPONSIBLE', unitId: undefined, locationId: undefined }),
    })
    const res = mockRes()
    const next = vi.fn()

    expect(() => scopeMiddleware(req, res, next)).toThrow(AppError)
    try {
      scopeMiddleware(req, res, next)
    } catch (err) {
      expect((err as AppError).status).toBe(403)
    }
  })

  it('req.user yok ise AppError (403) fırlatır', () => {
    const req = mockReq({ user: undefined })
    const res = mockRes()
    const next = vi.fn()

    expect(() => scopeMiddleware(req, res, next)).toThrow(AppError)
  })
})
