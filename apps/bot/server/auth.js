'use strict';

/* Bot uçları için kimlik doğrulama. Kapıyı nginx de tutuyor, ama container
   ağına doğrudan erişilirse koruma kalmasın diye token burada bir kez daha
   doğrulanır — yönetim uygulamasıyla aynı secret, issuer ve audience ile. */

const crypto = require('crypto');

const JWT_ISSUER = 'gri-tms';
const JWT_AUDIENCE = 'gri-tms-web';

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

/** Cookie başlığını ayrıştırır (cookie-parser bağımlılığı eklemeden). */
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/** HS256 imzalı JWT'yi doğrular; imza, süre, iss/aud veya typ hatalıysa fırlatır. */
function verifyAccessToken(token, secret) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('malformed token');

  const [headerB64, payloadB64, signatureB64] = parts;

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  if (header.alg !== 'HS256') throw new Error('unexpected algorithm');

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actual = base64UrlDecode(signatureB64);

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error('invalid signature');
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && nowSec >= payload.exp) throw new Error('token expired');
  if (typeof payload.nbf === 'number' && nowSec < payload.nbf) throw new Error('token not active');
  if (payload.iss !== JWT_ISSUER) throw new Error('invalid issuer');

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(JWT_AUDIENCE)) throw new Error('invalid audience');
  if (payload.typ !== 'access') throw new Error('invalid token type');

  return payload;
}

/* Bot uçlarını korur: geçerli access token + ADMIN rolü şarttır.
   ACCESS_TOKEN_SECRET tanımlı değilse servis açık kalmasın diye 503 döner. */
function requireAdmin(req, res, next) {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  if (!secret) {
    console.error('[bot] ACCESS_TOKEN_SECRET tanımlı değil — istek reddedildi');
    return res.status(503).json({
      success: false,
      message: 'Bot servisi yapılandırılmamış. Yöneticinizle iletişime geçin.',
    });
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Oturum bulunamadı. Lütfen giriş yapın.' });
  }

  let payload;
  try {
    payload = verifyAccessToken(token, secret);
  } catch (err) {
    console.warn('[bot] Token doğrulanamadı:', err.message);
    return res.status(401).json({ success: false, message: 'Oturumunuz geçersiz. Lütfen tekrar giriş yapın.' });
  }

  // Zorunlu şifre değişimi bekleyen kullanıcı bot'u da kullanamaz
  if (payload.mustChangePassword) {
    return res.status(403).json({
      success: false,
      message: 'Devam etmeden önce şifrenizi değiştirmelisiniz.',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  }

  if (payload.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Bu işlem için admin yetkisi gerekli.' });
  }

  req.user = { id: payload.id, username: payload.username, role: payload.role };
  next();
}

module.exports = { requireAdmin, verifyAccessToken, parseCookies, JWT_ISSUER, JWT_AUDIENCE };
