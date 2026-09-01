/* ========================================================================
   GÜVENLİK YAPILANDIRMASI (JWT & COOKIE)
   Token süreleri ve Cookie güvenlik politikaları
   ======================================================================== */

interface TokenConfig {
  readonly secret: string;
  readonly expiresIn: number; // saniye cinsinden
}

interface JwtConfigShape {
  readonly access: TokenConfig;
  readonly refresh: TokenConfig;
}

interface CookieMaxAge {
  readonly access: number;
  readonly refresh: number;
}

interface CookieConfigShape {
  readonly httpOnly: boolean;
  readonly sameSite: 'strict' | 'lax' | 'none';
  readonly secure: boolean;
  readonly maxAge: CookieMaxAge;
}

// JWT Yapılandırması: Access ve Refresh Token sırları ve süreleri

// Secret gücü doğrulanmıyordu — .env.prod'a "abc" yazılsa kabul ediliyordu.
function requireEnv(name: 'ACCESS_TOKEN_SECRET' | 'REFRESH_TOKEN_SECRET'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  if (process.env.NODE_ENV === 'production' && value.length < 32) {
    throw new Error(
      `${name} production ortamında en az 32 karakter olmalıdır. Üretmek için:\n` +
      `  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
    );
  }
  return value;
}

// Token'lara kimlik damgası — aynı secret başka bir yerde kullanılsa bile
// bu iss/aud çiftini taşımayan token kabul edilmez.
export const JWT_ISSUER = 'gri-tms';
export const JWT_AUDIENCE = 'gri-tms-web';
export const JWT_ALGORITHM = 'HS256' as const;

export const jwtConfig: JwtConfigShape = {
  access: {
    secret: requireEnv('ACCESS_TOKEN_SECRET'),
    expiresIn: 15 * 60, // 900 saniye (15 dakika)
  },
  refresh: {
    secret: requireEnv('REFRESH_TOKEN_SECRET'),
    expiresIn: 7 * 24 * 60 * 60, // 604800 saniye (7 gün)
  },
};

// Cookie Yapılandırması: Güvenlik bayrakları (httpOnly, sameSite, secure)

export const cookieConfig: CookieConfigShape = {
  httpOnly: true, // JavaScript tarafından erişilemez
  // 'strict' iken e-posta/dış linkten gelen kullanıcı ilk yüklemede çıkış
  // yapmış görünüyordu. 'lax' CSRF korumasını POST için korur, deneyimi bozmaz.
  sameSite: 'lax',
  secure: process.env.COOKIE_SECURE === 'true', // HTTPS varsa true, HTTP ise false
  maxAge: {
    access: 15 * 60 * 1000, // 15 dakika (ms)
    refresh: 7 * 24 * 60 * 60 * 1000, // 7 gün (ms)
  },
};
