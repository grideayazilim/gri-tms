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
      req.body = result.data as unknown;
    } else {
      const targetObj = req[target] as Record<string, unknown>;
      // Clear existing keys to ensure only validated data exists
      for (const key of Object.keys(targetObj)) {
        delete targetObj[key];
      }
      Object.assign(targetObj, result.data);
    }
    next();
  };
