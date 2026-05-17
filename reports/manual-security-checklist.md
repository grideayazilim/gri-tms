# Manuel Güvenlik Kontrol Listesi

**Tarih:** 2026-05-17  
**Yöntem:** Kaynak kodu statik analizi (node_modules hariç)  
**Kapsam:** `apps/management/server`, `apps/bot/server`, `nginx/`, Docker konfigürasyonu

---

## Kontrol Listesi

| # | Kontrol | Durum | Etkilenen Dosya | Not |
|---|---------|-------|-----------------|-----|
| 1 | `.env` dosyaları `.gitignore`'da mı? | ✅ | `.gitignore` (root + server) | `.env`, `.env.prod`, `.env.test` hepsi ignore edilmiş. Sadece `*.example` dosyaları commit'leniyor. |
| 2 | JWT secret yeterince uzun mu? (min 256 bit) | ✅ | `.env.example`, `.env.prod.example` | `requireEnv()` ile production'da zorunlu tutulmuş. `.env.example` ve `.env.prod.example`'a `node -e "require('crypto').randomBytes(64).toString('hex')"` üretim komutu eklendi. |
| 3 | Password hashing kullanılıyor mu? (bcrypt) | ✅ | `authController.ts:28`, `seeder.ts:31` | `bcrypt.hash(password, 10)` — saltRounds=10, yeterli. |
| 4 | Rate limiting aktif mi? | ✅ (Kısmi) | `authRoutes.ts:13-20` | Auth endpoint'leri (`/login`, `/register`) için 20 req/15dk. **Diğer endpoint'lerde global rate limit yok.** |
| 5 | CORS origin'leri kısıtlı mı? | ⚠️ | `app.ts:29`, `bot/server/server.js:46` | Management server: `FRONTEND_URL` env var kısıtlaması ✅. Bot server: `cors()` parametresiz = wildcard ❌. |
| 6 | Helmet middleware aktif mi? | ✅ (Kısmi) | `app.ts:27` | Management server'da `app.use(helmet())` aktif. **Bot server'da Helmet yok.** |
| 7 | SQL sorgularında parameterized query kullanılıyor mu? (Zod + Drizzle) | ✅ | Tüm repository dosyaları | Drizzle ORM parameterized queries kullanıyor. `sql\`...\`` tagged templates SQL injection'ı önlüyor. |
| 8 | File upload'da dosya tipi kontrolü var mı? | ✅ | `bot/server/server.js:58-63` | Multer `fileFilter` ile `.xlsx` ve `.xls` uzantısı kontrol ediliyor. `limits.fileSize = 10MB` tanımlı. |
| 9 | Error response'larda stack trace dönmüyor mu? (production) | ✅ | `errorMiddleware.ts:35-38` | 500 hatalarında sadece `"Sunucu hatası"` mesajı dönüyor. Stack trace yalnızca Winston logger'a (Docker logs) yazılıyor. |
| 10 | Audit log'da hassas veri (şifre vs.) loglanmıyor mu? | ✅ | `auditLogger.ts` | `FIELD_MAPS` whitelist tabanlı — sadece izin verilen alanlar loglanıyor. `passwordHash` field map'de yok. |
| 11 | Cookie'de HttpOnly ve Secure flag var mı? | ✅ (Koşullu) | `jwt.ts:39-45` | `httpOnly: true` her zaman. `secure: COOKIE_SECURE === 'true'` — production'da env var doğru set edilmeli. |
| 12 | Input validation tüm endpoint'lerde var mı? (Zod) | ✅ | Tüm route dosyaları | `validate(schema)` middleware tüm POST/PUT route'larında mevcut. GET parametreleri controller'da doğrulanıyor. |
| 13 | Admin endpoint'leri middleware ile korunuyor mu? | ✅ | Tüm admin route'ları | `router.use(authMiddleware, adminMiddleware)` pattern'i tutarlı uygulanmış. |
| 14 | Dosya yollarında path traversal koruması var mı? | ✅ | `bot/server/server.js` | Multer `memoryStorage()` kullanılıyor — dosya diske yazılmıyor. Disk tabanlı path operation yok. |
| 15 | HTTPS zorunlu mu? (production) | ⚠️ | `nginx/nginx.conf`, `.env.prod.example` | `.env.prod.example` içinde `COOKIE_SECURE=true` zorunlu hale getirildi. SSL sertifikası edinildiğinde nginx'e `listen 443 ssl` + HSTS header eklenebilir. |
| 16 | Sistem reset audit izi koruması | ⚠️ | `resetController.ts:79` | `systemReset` işlemi `auditLogs` tablosunu da siliyor. Reset öncesi yazılan tek log da bu işlemle kayboluyor. KVKK uyumu için audit logların ayrı bir immutable depolama alanına (örn. ayrı DB/S3) taşınması önerilir. |
| 17 | PII at-rest şifreleme (TC No, IBAN) | ⚠️ | `database/migrations/0000_fresh_zzzax.sql` | `employees.tc_no` ve `employees.iban_no` kolonları plaintext `text` olarak saklanıyor. KVKK kapsamında kişisel veri niteliğindedir. Sektör standardı: PostgreSQL `pgcrypto` ile AES-256 at-rest şifreleme. Mevcut veriyi etkileyen bir migrasyon gerektirir — sonraki sprint için planlanmıştır. |

---

## Kritik Bulgular Özeti

### Düzeltme Özeti

| # | Bulgu | Durum | Aksiyon |
|---|-------|-------|---------|
| 2 | JWT secret rehberliği | ✅ Tamamlandı | `.env.example` + `.env.prod.example`'a `crypto.randomBytes(64)` komutu eklendi |
| 4 | Global rate limiting | ✅ Tamamlandı | `app.ts`'e `/api/` için 300 req/15dk limiter eklendi |
| 5 | Bot CORS wildcard | ✅ Tamamlandı | `server.js` ALLOWED_ORIGIN env var ile kısıtlandı |
| 6 | Bot Helmet eksik | ✅ Tamamlandı | `server.js`'e `helmet()` eklendi |
| 11/15 | HTTPS / Secure Cookie | ✅ Kısmi | `.env.prod.example` COOKIE_SECURE=true yapıldı. SSL cert gerektiren HTTPS nginx config deployment sorumluluğundadır. |

**CSRF notu:** Bot server cookie tabanlı auth kullanmıyor (kendi istemcileri için). IskurAuthClient'in kullandığı cookie'ler harici ISKUR portalına ait — bu nedenle CSRF bot server için geçerli değil (N/A).

---

## Pozitif Bulgular (İyi Uygulamalar)

- **bcrypt** ile güvenli parola hash'leme (saltRounds=10)
- **Drizzle ORM** ile SQL injection'dan korunan parameterized query'ler
- **Zod** schema validation tüm input endpoint'lerinde
- **JWT cookie-based auth** — localStorage kullanılmıyor (XSS riski azaltılmış)
- **httpOnly cookies** — JavaScript erişimi engellenmiş
- **Helmet** — management server'da CSP, X-Frame-Options, X-Content-Type-Options aktif
- **Audit logging** — kritik işlemler whitelist tabanlı loglanıyor, hassas veri loglanmıyor
- **Admin/Scope middleware** — rol bazlı erişim kontrolü tutarlı uygulanmış
- **Error masking** — production'da stack trace client'a gönderilmiyor
- **Memory storage** — file upload'da disk I/O yok, path traversal riski minimal
