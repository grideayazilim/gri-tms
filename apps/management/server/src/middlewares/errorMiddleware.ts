import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

function isRecordWithCode(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function getPgCode(err: unknown): string | undefined {
  if (isRecordWithCode(err)) return err.code;
  // DrizzleQueryError wraps the original pg error in .cause
  if (err instanceof Error && isRecordWithCode((err as { cause?: unknown }).cause)) {
    return (err as { cause: { code: string } }).cause.code;
  }
  return undefined;
}

export const errorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  // PostgreSQL Unique Violation (23505): çakışan kayıt → 409
  if (getPgCode(err) === '23505') {
    res.status(409).json({ success: false, message: 'Bu kayıt zaten mevcut' });
    return;
  }

  // AppError — bilinen uygulama hataları (4xx)
  if (err instanceof AppError) {
    logger.debug('AppError', { method: req.method, path: req.path, status: err.status, message: err.message });
    res.status(err.status).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Bilinmeyen hata — 500 (sunucu hatası, error seviyesinde logla)
  const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled server error', {
    method: req.method,
    path: req.path,
    message,
    stack,
  });

  res.status(500).json({
    success: false,
    message: 'Sunucu hatası',
  });
};
