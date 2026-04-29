/* ========================================================================
   TOKEN YARDIMCILARI (JWT UTILS)
   Giriş ve yenileme token'larının oluşturulması ve doğrulanması
   ======================================================================== */
import jwt from 'jsonwebtoken';

import type { JwtPayload } from '@timesheet/shared';
import { jwtConfig } from '../config/jwt.js';
import { unauthorized } from './AppError.js';

// Access Token: Kısa ömürlü, her istekte gönderilen kimlik bilgisi
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn,
  });
};

// Refresh Token: Uzun ömürlü, yeni Access Token almak için kullanılır
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, jwtConfig.refresh.secret, {
    expiresIn: jwtConfig.refresh.expiresIn,
  });
};

// Access token doğrula
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, jwtConfig.access.secret) as JwtPayload;
  } catch {
    throw unauthorized('Invalid access token');
  }
};

// Refresh token doğrula
export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, jwtConfig.refresh.secret) as JwtPayload;
  } catch {
    throw unauthorized('Invalid refresh token');
  }
};
