import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

// Access token oluştur (kısa ömürlü)
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expiresIn,
  });
};

// Refresh token oluştur (uzun ömürlü)
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refresh.secret, {
    expiresIn: jwtConfig.refresh.expiresIn,
  });
};

// Access token doğrula
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.access.secret);
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

// Refresh token doğrula
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.refresh.secret);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

