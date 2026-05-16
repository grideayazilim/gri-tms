import { describe, it, expect, vi, beforeEach } from 'vitest'
import { asyncHandler } from '../../../src/middlewares/asyncHandler.js'
import { mockReq, mockRes } from '../../helpers/mockRequest.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('asyncHandler', () => {
  it('async fonksiyon başarıyla tamamlanırsa next() hata olmadan çağrılmaz', async () => {
    const handler = asyncHandler(async (_req, res) => {
      res.status(200).json({ success: true, data: null })
    })

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await handler(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(next).not.toHaveBeenCalled()
  })

  it('async fonksiyon reject olursa next(err) çağrılır', async () => {
    const error = new Error('Async hata')
    const handler = asyncHandler(async () => {
      throw error
    })

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await handler(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })

  it('AppError fırlatılırsa next(appError) çağrılır', async () => {
    const { AppError } = await import('../../../src/utils/AppError.js')
    const appError = new AppError('Test hatası', 400)

    const handler = asyncHandler(async () => {
      throw appError
    })

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await handler(req, res, next)

    expect(next).toHaveBeenCalledWith(appError)
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(appError)
  })

  it('async fonksiyon tamamlandığında next() argüman olmadan çağrılmaz', async () => {
    const handler = asyncHandler(async (_req, _res, _next) => {
      // hiçbir şey yapma
    })

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await handler(req, res, next)

    expect(next).not.toHaveBeenCalled()
  })

  it('Promise.reject ile oluşan hata yakalanır', async () => {
    const error = new Error('Promise reject hatası')
    const handler = asyncHandler(() => Promise.reject(error))

    const req = mockReq()
    const res = mockRes()
    const next = vi.fn()

    await handler(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
