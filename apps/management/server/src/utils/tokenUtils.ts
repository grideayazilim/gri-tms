/* ========================================================================
   TOKEN YARDIMCILARI (JWT UTILS)
   Giriş ve yenileme token'larının oluşturulması ve doğrulanması

   Sertleştirmeler:
     - algorithms açıkça sabit (alg confusion / none saldırısına karşı sigorta)
     - issuer + audience damgası
     - typ alanı ile access/refresh token'ları birbirinden ayrılır
   ======================================================================== */
import jwt from 'jsonwebtoken';

import type { JwtPayload } from '@timesheet/shared';
import { jwtConfig, JWT_ISSUER, JWT_AUDIENCE, JWT_ALGORITHM } from '../config/jwt.js';
import { AppError, unauthorized } from './AppError.js';

type TokenType = 'access' | 'refresh';

interface SignedPayload extends JwtPayload {
  typ: TokenType;
}

// Access Token: Kısa ömürlü, her istekte gönderilen kimlik bilgisi
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload, typ: 'access' satisfies TokenType }, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};

// Refresh Token: Uzun ömürlü, yeni Access Token almak için kullanılır
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign({ ...payload, typ: 'refresh' satisfies TokenType }, jwtConfig.refresh.secret, {
    expiresIn: jwtConfig.refresh.expiresIn,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
};

function verify(token: string, secret: string, expectedType: TokenType, errorMessage: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (typeof decoded === 'string') {
      throw unauthorized('Invalid token payload');
    }

    // Access token'ı refresh yerine (veya tersi) kullanma denemesini reddet
    if ((decoded as SignedPayload).typ !== expectedType) {
      throw unauthorized('Invalid token payload');
    }

    return decoded as JwtPayload;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw unauthorized(errorMessage);
  }
}

// Access token doğrula
export const verifyAccessToken = (token: string): JwtPayload => {
  return verify(token, jwtConfig.access.secret, 'access', 'Invalid access token');
};

// Refresh token doğrula
export const verifyRefreshToken = (token: string): JwtPayload => {
  return verify(token, jwtConfig.refresh.secret, 'refresh', 'Invalid refresh token');
};
