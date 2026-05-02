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

export const jwtConfig: JwtConfigShape = {
  access: {
    secret: process.env.ACCESS_TOKEN_SECRET || 'your_access_token_secret_change_in_production',
    expiresIn: 15 * 60, // 900 saniye (15 dakika)
  },
  refresh: {
    secret: process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_change_in_production',
    expiresIn: 7 * 24 * 60 * 60, // 604800 saniye (7 gün)
  },
};

// Cookie Yapılandırması: Güvenlik bayrakları (httpOnly, sameSite, secure)

export const cookieConfig: CookieConfigShape = {
  httpOnly: true, // JavaScript tarafından erişilemez
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  secure: process.env.COOKIE_SECURE === 'true', // HTTPS varsa true, HTTP ise false
  maxAge: {
    access: 15 * 60 * 1000, // 15 dakika (ms)
    refresh: 7 * 24 * 60 * 60 * 1000, // 7 gün (ms)
  },
};
