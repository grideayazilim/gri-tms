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

const mockPayload = {
  id: 'user-1',
  username: 'admin',
  role: 'ADMIN' as const,
  locationId: null,
  unitId: null,
  mustChangePassword: false,
  tokenVersion: 0,
}
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
    expect(calledPayload).toMatchObject({ id: 'user-1', username: 'admin', typ: 'access' })
  })

  // imzalama seçeneklerinde de algoritma/iss/aud sabit olmalı
  it('sign çağrısında algorithm/issuer/audience sabitlenir', () => {
    mockJwt.sign.mockReturnValue('token')
    generateAccessToken(mockPayload)
    const [, , options] = mockJwt.sign.mock.calls[0] as unknown[]
    expect(options).toMatchObject({
      algorithm: 'HS256',
      issuer: 'gri-tms',
      audience: 'gri-tms-web',
    })
  })
})

describe('generateRefreshToken', () => {
  it('jwt.sign çağrılır ve sonucu döner', () => {
    mockJwt.sign.mockReturnValue('refresh.token.here')
    const token = generateRefreshToken(mockPayload)
    expect(mockJwt.sign).toHaveBeenCalledOnce()
    expect(token).toBe('refresh.token.here')
  })

  it('payload typ=refresh ile imzalanır', () => {
    mockJwt.sign.mockReturnValue('token')
    generateRefreshToken(mockPayload)
    const [calledPayload] = mockJwt.sign.mock.calls[0] as unknown[]
    expect(calledPayload).toMatchObject({ typ: 'refresh' })
  })
})

describe('verifyAccessToken', () => {
  it('geçerli token için payload döner', () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload, typ: 'access', iat: 1000, exp: 2000 })
    const result = verifyAccessToken('valid.token')
    expect(result).toMatchObject(mockPayload)
  })

  // algoritma, issuer ve audience açıkça sabitlenmeli
  it('verify çağrısında algorithms/issuer/audience sabitlenir', () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload, typ: 'access' })
    verifyAccessToken('valid.token')
    const [, , options] = mockJwt.verify.mock.calls[0] as unknown[]
    expect(options).toMatchObject({
      algorithms: ['HS256'],
      issuer: 'gri-tms',
      audience: 'gri-tms-web',
    })
  })

  // refresh token'ı access token yerine kullanma denemesi reddedilmeli
  it('typ alanı access değilse reddeder', () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload, typ: 'refresh' })
    expect(() => verifyAccessToken('refresh.token')).toThrow(AppError)
  })

  it('typ alanı hiç yoksa reddeder', () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload })
    expect(() => verifyAccessToken('legacy.token')).toThrow(AppError)
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
    mockJwt.verify.mockReturnValue({ ...mockPayload, typ: 'refresh' })
    const result = verifyRefreshToken('valid.refresh')
    expect(result).toMatchObject(mockPayload)
  })

  // access token'ı refresh yerine kullanma denemesi reddedilmeli
  it('typ alanı refresh değilse reddeder', () => {
    mockJwt.verify.mockReturnValue({ ...mockPayload, typ: 'access' })
    expect(() => verifyRefreshToken('access.token')).toThrow(AppError)
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
