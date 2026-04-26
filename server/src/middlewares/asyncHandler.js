/* ========================================================================
   ASYNC HANDLER
   Async fonksiyonlardaki hataları otomatik yakalayıp next()'e iletir
   ======================================================================== */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
