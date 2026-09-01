import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockVerifyAccessToken } = vi.hoisted(() => ({
  mockVerifyAccessToken: vi.fn(),
}))

vi.mock('../../../src/utils/tokenUtils.js', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}))

vi.mock('../../../src/utils/logger.js', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { authMiddleware } from '../../../src/middlewares/authMiddleware.js'
import { mockReq, mockRes } from '../../helpers/mockRequest.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authMiddleware', () => {
  it('geçerli token ile req.user set edilir ve next() çağrılır', async () => {
    const userPayload = {
      id: 'u1', username: 'admin', role: 'ADMIN' as const,
      locationId: null, unitId: null, mustChangePassword: false, tokenVersion: 0,
    }
    mockVerifyAccessToken.mockReturnValue(userPayload)

    const req = mockReq({ cookies: { accessToken: 'valid.jwt.token' } })
    const res = mockRes()
    const next = vi.fn()

    await authMiddleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toEqual(userPayload)
  })

  it('cookie\'de token yoksa 401 döner ve next() çağrılmaz', async () => {
    const req = mockReq({ cookies: {} })
    const res = mockRes()
    const next = vi.fn()

    await authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
    expect(next).not.toHaveBeenCalled()
  })

  it('geçersiz token için 401 döner ve next() çağrılmaz', async () => {
    mockVerifyAccessToken.mockImplementation(() => { throw new Error('invalid signature') })

    const req = mockReq({ cookies: { accessToken: 'bad.token' } })
    const res = mockRes()
    const next = vi.fn()

    await authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('süresi dolmuş token için 401 döner', async () => {
    mockVerifyAccessToken.mockImplementation(() => { throw new Error('jwt expired') })

    const req = mockReq({ cookies: { accessToken: 'expired.token' } })
    const res = mockRes()
    const next = vi.fn()

    await authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.any(String) }),
    )
  })

  /* Zorunlu şifre değişimi kapısı — modal tek başına curl ile baypas
     edilebilirdi; kapı sunucu tarafında. */
  describe('zorunlu şifre değişimi kapısı', () => {
    const gatedUser = {
      id: 'u1', username: 'admin', role: 'ADMIN' as const,
      locationId: null, unitId: null, mustChangePassword: true, tokenVersion: 0,
    }

    it('bayrak açıkken korumalı uca 403 döner', async () => {
      mockVerifyAccessToken.mockReturnValue(gatedUser)
      const req = mockReq({ cookies: { accessToken: 't' }, originalUrl: '/api/employees' })
      const res = mockRes()
      const next = vi.fn()

      await authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }),
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('şifre değiştirme ucuna izin verir', async () => {
      mockVerifyAccessToken.mockReturnValue(gatedUser)
      const req = mockReq({ cookies: { accessToken: 't' }, originalUrl: '/api/auth/change-initial-password' })
      const res = mockRes()
      const next = vi.fn()

      await authMiddleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })

    it('logout ve me uçlarına izin verir', async () => {
      mockVerifyAccessToken.mockReturnValue(gatedUser)
      for (const url of ['/api/auth/logout', '/api/auth/me']) {
        const req = mockReq({ cookies: { accessToken: 't' }, originalUrl: url })
        const res = mockRes()
        const next = vi.fn()
        await authMiddleware(req, res, next)
        expect(next).toHaveBeenCalledOnce()
      }
    })

    it('query string kapıyı baypas edemez', async () => {
      mockVerifyAccessToken.mockReturnValue(gatedUser)
      const req = mockReq({ cookies: { accessToken: 't' }, originalUrl: '/api/employees?page=1' })
      const res = mockRes()
      const next = vi.fn()

      await authMiddleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(next).not.toHaveBeenCalled()
    })

    it('bayrak kapalıyken normal akış devam eder', async () => {
      mockVerifyAccessToken.mockReturnValue({ ...gatedUser, mustChangePassword: false })
      const req = mockReq({ cookies: { accessToken: 't' }, originalUrl: '/api/employees' })
      const res = mockRes()
      const next = vi.fn()

      await authMiddleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
    })
  })

  it('401 yanıtında token bulunamadı mesajı var (token yok senaryosu)', async () => {
    const req = mockReq({ cookies: {} })
    const res = mockRes()
    const next = vi.fn()

    await authMiddleware(req, res, next)

    const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(jsonArg.message).toContain('Token')
  })
})
