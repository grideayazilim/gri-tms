/* ========================================================================
   VALIDATE MIDDLEWARE
   Zod şemalarını kullanarak gelen veriyi (Body/Query/Params) doğrular
   ======================================================================== */
export const validate = (schema, target = 'body') => (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
        const firstError = result.error.errors[0];
        return res.status(400).json({
            success: false,
            message: firstError.message,
            errors: result.error.flatten().fieldErrors,
        });
    }

    if (target === 'body') {
        req.body = result.data;
    } else {
        // req.query ve req.params genellikle getter'dır, doğrudan atama yapılamayabilir
        const targetObj = req[target];
        // Mevcut keyleri temizle
        for (const key in targetObj) {
            delete targetObj[key];
        }
        Object.assign(targetObj, result.data);
    }
    next();
};
