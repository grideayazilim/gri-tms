/* ========================================================================
   ASYNC HANDLER
   Async fonksiyonlardaki hataları otomatik yakalayıp next()'e iletir
   ======================================================================== */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type qs from 'qs';

export const asyncHandler = <P = Record<string, string>, ResBody = unknown, ReqBody = unknown, ReqQuery = qs.ParsedQs>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> =>
  ((req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)) as RequestHandler<P, ResBody, ReqBody, ReqQuery>;
