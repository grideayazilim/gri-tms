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

function isPayloadTooLarge(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'type' in err
    && (err as { type?: unknown }).type === 'entity.too.large';
}

export const errorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  // express.json limiti aşıldı → anlamlı 413 mesajı
  if (isPayloadTooLarge(err)) {
    logger.warn('İstek gövdesi çok büyük', { method: req.method, path: req.path, ip: req.ip });
    res.status(413).json({
      success: false,
      message: 'Gönderilen veri çok büyük. Daha küçük parçalar halinde deneyin.',
    });
    return;
  }

  // PostgreSQL Unique Violation (23505): çakışan kayıt → 409
  if (getPgCode(err) === '23505') {
    res.status(409).json({ success: false, message: 'Bu kayıt zaten mevcut' });
    return;
  }

  /* Deadlock (40P01) — kilit sıralamasıyla yapısal olarak engellendi ama
     tamamen imkânsız değil. Generic "Sunucu hatası" yerine ne yapacağını
     söyleyen bir mesaj ver. */
  if (getPgCode(err) === '40P01') {
    logger.warn('Deadlock tespit edildi', { method: req.method, path: req.path });
    res.status(409).json({
      success: false,
      message: 'Aynı kayıtlar başka bir kullanıcı tarafından da düzenleniyor. Lütfen tekrar deneyin.',
    });
    return;
  }

  /* Sorgu zaman aşımı (57014) — 30 saniyelik statement_timeout'a
     takılan istek. Kullanıcı "sunucu hatası" değil, ne olduğunu görmeli. */
  if (getPgCode(err) === '57014') {
    logger.warn('Sorgu zaman aşımına uğradı', { method: req.method, path: req.path });
    res.status(503).json({
      success: false,
      message: 'İşlem çok uzun sürdü ve iptal edildi. Daha dar bir filtreyle tekrar deneyin.',
    });
    return;
  }

  /* Veritabanı yetki hatası (42501). Sistem sıfırlama, app_user'ın TRUNCATE
     yetkisi olmadığı için 500 "Sunucu hatası" dönüyordu ve gerçek sebep yalnızca
     sunucu günlüğünde kalıyordu. Bu sınıf hata bir daha gömülmemeli. */
  if (getPgCode(err) === '42501') {
    const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
    logger.error('Veritabanı yetki hatası', { method: req.method, path: req.path, message });
    res.status(500).json({
      success: false,
      message: 'Veritabanı yetkisi eksik olduğu için işlem yapılamadı. Hiçbir veri değiştirilmedi. Sistem yöneticisine başvurun.',
    });
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
