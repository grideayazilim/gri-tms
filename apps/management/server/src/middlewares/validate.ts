/* ========================================================================
   VALIDATE MIDDLEWARE
   Zod şemalarını kullanarak gelen veriyi (Body/Query/Params) doğrular
   ======================================================================== */
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

// Envanter K: TS-safe mutasyon — mevcut davranış korunuyor, tipler eklendi
export const validate = (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const firstError = result.error.errors[0];
      res.status(400).json({
        success: false,
        message: firstError?.message ?? 'Doğrulama hatası',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    if (target === 'body') {
      req.body = result.data;
    } else {
      // req.query ve req.params genellikle getter'dır, doğrudan atama yapılamayabilir
      const targetObj = req[target] as Record<string, unknown>;
      // Mevcut keyleri temizle
      for (const key of Object.keys(targetObj)) {
        delete targetObj[key];
      }
      Object.assign(targetObj, result.data);
    }
    next();
  };
