import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('jsonwebtoken', () => {
  return {
    default: {
      sign: vi.fn(),
      verify: vi.fn(),
    },
  }
})

import jwt from 'jsonwebtoken'
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../../src/utils/tokenUtils.js'
import { AppError } from '../../../src/utils/AppError.js'

const mockPayload = { id: 'user-1', username: 'admin', role: 'ADMIN' as const }
const mockJwt = jwt as unknown as { sign: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateAccessToken', () => {
  it('jwt.sign çağrılır ve sonucu döner', () => {
    mockJwt.sign.mockReturnValue('access.token.here')
    const token = generateAccessToken(mockPayload)
    expect(mockJwt.sign).toHaveBeenCalledOnce()
    expect(token).toBe('access.token.here')
  })

  it('payload ile çağrılır', () => {
    mockJwt.sign.mockReturnValue('token')
    generateAccessToken(mockPayload)
    const [calledPayload] = mockJwt.sign.mock.calls[0] as unknown[]
    expect(calledPayload).toMatchObject({ id: 'user-1', username: 'admin' })
  })
})

describe('generateRefreshToken', () => {
  it('jwt.sign çağrılır ve sonucu döner', () => {
    mockJwt.sign.mockReturnValue('refresh.token.here')
    const token = generateRefreshToken(mockPayload)
    expect(mockJwt.sign).toHaveBeenCalledOnce()
    expect(token).toBe('refresh.token.here')
  })
})

describe('verifyAccessToken', () => {
  it('geçerli token için payload döner', () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload, iat: 1000, exp: 2000 })
    const result = verifyAccessToken('valid.token')
    expect(result).toMatchObject(mockPayload)
  })

  it('verify string döndürdüğünde AppError fırlatır', () => {
    mockJwt.verify.mockReturnValue('string-payload')
    expect(() => verifyAccessToken('bad.token')).toThrow(AppError)
  })

  it('verify hata fırlatırsa AppError (401) fırlatır', () => {
    mockJwt.verify.mockImplementation(() => { throw new Error('jwt expired') })
    expect(() => verifyAccessToken('expired.token')).toThrow(AppError)
    try {
      verifyAccessToken('expired.token')
    } catch (err) {
      expect((err as AppError).status).toBe(401)
    }
  })

  it('AppError zaten fırlatılmışsa yeniden fırlatır (wrap etmez)', () => {
    const appErr = new AppError('Unauthorized', 401)
    mockJwt.verify.mockImplementation(() => { throw appErr })
    try {
      verifyAccessToken('token')
    } catch (err) {
      expect(err).toBe(appErr)
    }
  })
})

describe('verifyRefreshToken', () => {
  it('geçerli token için payload döner', () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload })
    const result = verifyRefreshToken('valid.refresh')
    expect(result).toMatchObject(mockPayload)
  })

  it('geçersiz token için AppError fırlatır', () => {
    mockJwt.verify.mockImplementation(() => { throw new Error('invalid') })
    expect(() => verifyRefreshToken('bad')).toThrow(AppError)
  })

  it('verify string döndürdüğünde AppError (401) fırlatır', () => {
    mockJwt.verify.mockReturnValue('string-payload')
    expect(() => verifyRefreshToken('token')).toThrow(AppError)
    try {
      verifyRefreshToken('token')
    } catch (err) {
      expect((err as AppError).status).toBe(401)
    }
  })
})
