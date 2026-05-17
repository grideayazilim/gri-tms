# SAST Güvenlik Raporu

**Tarih:** 2026-05-17  
**Araç:** Semgrep v1.163.0 (`--config=auto`) + Manuel kod analizi  
**Kapsam:** Tüm kaynak dosyalar (`apps/management`, `apps/bot`, `nginx/`, `docker/`)  
**Tarama:** 276 kural, 255 dosya, 9 otomatik bulgu

---

## Özet Tablosu

| ID  | Bulgu                              | Dosya                                      | Risk     | Kaynak   | Durum     |
|-----|------------------------------------|--------------------------------------------|----------|----------|-----------|
| S1  | Docker root user (4 Dockerfile)    | Tüm Dockerfile'lar                         | HIGH     | Semgrep  | ❌ Açık   |
| S2  | CORS wildcard (`cors()`)           | `apps/bot/server/server.js:46`             | HIGH     | Manuel   | ❌ Açık   |
| S3  | Hardcoded weak default password    | `apps/management/server/database/seeder.ts:29` | MEDIUM | Manuel | ⚠️ Low Risk |
| S4  | Nginx H2C Smuggling                | `nginx/nginx.conf:42-44`                   | MEDIUM   | Semgrep  | ⚠️ Açık   |
| S5  | CSRF middleware yok (bot server)   | `apps/bot/server/server.js`                | MEDIUM   | Semgrep  | ⚠️ Açık   |
| S6  | JWT örnek secret zayıf (36 char)   | `.env.example`, `.env.test.example`        | MEDIUM   | Manuel   | ⚠️ Açık   |
| S7  | Object.assign mass assignment      | `employeeController.ts:149`                | LOW      | Semgrep  | ✅ FP     |
| S8  | Object.assign mass assignment      | `locationAndUnitController.ts:203`         | LOW      | Semgrep  | ✅ FP     |

---

## Detaylı Bulgular

### S1 — Tüm Dockerfile'larda Root User ❌ HIGH

**Araç:** Semgrep `dockerfile.security.missing-user`  
**Dosyalar:**
- `apps/bot/client/Dockerfile:23` — nginx CMD root olarak çalışıyor
- `apps/bot/server/Dockerfile:11` — Node.js sunucu root olarak çalışıyor
- `apps/management/client/Dockerfile:34` — nginx CMD root olarak çalışıyor
- `apps/management/server/Dockerfile:51-52` — ENTRYPOINT + CMD root olarak çalışıyor

**Açıklama:** Hiçbir Dockerfile'da `USER` direktifi yok. Container process exploit edilirse saldırgan container içinde root yetkisine sahip olur. Docker'ın varsayılan kullanıcısı root'tur.

**Düzeltme — Management Server Dockerfile:**
```dockerfile
# runner stage sonuna ekle
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser
```

**Düzeltme — Nginx tabanlı Dockerfile'lar:**
```dockerfile
# nginx 1.27+ nginx kullanıcısı ile çalışır, ancak CMD'den önce:
USER nginx
CMD ["nginx", "-g", "daemon off;"]
```

> Not: nginx port 80'de dinlediği için `USER nginx` öncesinde `nginx.conf`'un 80 yerine 8080 gibi unprivileged port kullanması gerekebilir (ya da `CAP_NET_BIND_SERVICE` capability yeterli).

---

### S2 — CORS Wildcard `cors()` ❌ HIGH

**Araç:** Manuel  
**Dosya:** `apps/bot/server/server.js:46`

```javascript
// MEVCUT — TÜM ORIGIN'LERE AÇIK
app.use(cors());

// ÖNERİLEN
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:80',
  credentials: true,
}));
```

**Açıklama:** `cors()` parametresiz çağrıldığında `Access-Control-Allow-Origin: *` header'ı döner. Bot server'a herhangi bir web sitesinden cross-origin istek yapılabilir. Kullanıcı oturum cookiesi varsa CSRF saldırısı vektörü oluşur.

**Risk bağlamı:** Bot server internal tool niteliğinde (nginx `/bot-api/` proxy ile ulaşılıyor) ancak origin kısıtlaması yine de zorunludur.

---

### S3 — Hardcoded Weak Default Password ⚠️ MEDIUM

**Araç:** Manuel  
**Dosya:** `apps/management/server/database/seeder.ts:29`

```typescript
// MEVCUT
const password = '1234';

// ÖNERİLEN
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) throw new Error('SEED_ADMIN_PASSWORD env var gerekli');
```

**Açıklama:** Seeder çalıştırıldığında admin kullanıcısına `1234` şifresi set edilir. Bu seed script development ve production ortamında çalıştırılabileceğinden zayıf default şifre risk oluşturur. bcrypt ile hash ediliyor, ancak şifre kendisi zayıf.

**Risk bağlamı:** Seeder script'i manual çalıştırıldığında geçerli. `ON CONFLICT DO UPDATE` ile var olan admin şifresi de `1234` olarak sıfırlanabilir.

---

### S4 — Nginx H2C Smuggling ⚠️ MEDIUM

**Araç:** Semgrep `generic.nginx.security.possible-nginx-h2c-smuggling`  
**Dosya:** `nginx/nginx.conf:42-44`

```nginx
# SORUNLU BLOK (/bot-api/ location)
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Açıklama:** `/bot-api/` location için HTTP Upgrade headers iletilmektedir. Bot server WebSocket kullanmıyorsa bu header'lar gereksiz. HTTP/2 cleartext (h2c) upgrade kombinasyonuyla reverse proxy bypass saldırısına zemin hazırlıyor.

**Karşılaştırma:** `/api/` location'da doğru şekilde `proxy_set_header Connection ""` kullanılmıştır.

**Düzeltme:**
```nginx
location /bot-api/ {
    proxy_pass http://bot-server:3001/;
    proxy_http_version 1.1;
    # WebSocket gerekmiyorsa:
    proxy_set_header Connection "";
    # proxy_set_header Upgrade $http_upgrade; -- KALDIR
    ...
}
```

---

### S5 — CSRF Middleware Yok (Bot Server) ⚠️ MEDIUM

**Araç:** Semgrep `express-check-csurf-middleware-usage`  
**Dosya:** `apps/bot/server/server.js:46`

**Açıklama:** Bot server Express uygulamasında CSRF koruması yok. Ancak bot server durum makinesini tetikleyen bir API (Excel yükleme, process başlatma). Cookie tabanlı auth kullanmadığı için CSRF riski düşük. Bununla birlikte, CORS wildcard (S2) ile birleşince risk artar.

**Risk bağlamı:** Bot server kullanıcı oturumu tutmuyor, her işlem bağımsız. Kritik değil, ancak S2 ile birlikte ele alınmalı.

---

### S6 — JWT Example Secret Zayıf ⚠️ MEDIUM

**Araç:** Manuel  
**Dosya:** `.env.example`, `.env.test.example`

```bash
# MEVCUT — Sadece 36 karakter (288 bit ama rastgele değil)
ACCESS_TOKEN_SECRET=dev_access_secret_change_in_production
REFRESH_TOKEN_SECRET=dev_refresh_secret_change_in_production

# TEST — Sadece 35 karakter
ACCESS_TOKEN_SECRET=test_access_token_secret_change_me
```

**Açıklama:** Example dosyalarındaki JWT secret değerleri açıklayıcı string'lerdir. Geliştirici bu değerleri kopyalayıp değiştirmeden kullanırsa zayıf secret ile production deploy edilir. JWT secretların minimum 256-bit (32 byte) **rastgele** entropy ile oluşturulması gerekir.

**Öneri — README'ye ekle:**
```bash
# Güçlü JWT secret üretimi:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### S7 & S8 — Object.assign "Data Exfiltration" ✅ FALSE POSITIVE

**Araç:** Semgrep `express-data-exfiltration`  
**Dosyalar:**
- `apps/management/server/src/controllers/employeeController.ts:149`
- `apps/management/server/src/controllers/locationAndUnitController.ts:203`

```typescript
// employeeController.ts:149
Object.assign(unitLookup, await employeeRepo.lookupUnitNames(tx, ids));
```

**Değerlendirme:** Bu `Object.assign` çağrıları HTTP response nesnesini değil, internal lookup map'i oluşturmaktadır. Kullanıcı girdisi assign edilmiyor; lookup sonuçları whitelist'e göre audit log formatlaması için kullanılıyor. **False positive** olarak kapatılmıştır.

---

## Güvenli Bulunan Alanlar

| Kontrol                        | Durum | Detay                                                                               |
|--------------------------------|-------|-------------------------------------------------------------------------------------|
| Hardcoded JWT secret (kod içi) | ✅    | JWT secret `requireEnv()` ile zorunlu env var'dan okunuyor, kod içinde yok         |
| SQL Injection                  | ✅    | Drizzle ORM parameterized queries + tagged template literals kullanılıyor           |
| XSS (backend)                  | ✅    | Tüm response'lar JSON; HTML rendering yok; React frontend auto-escape yapıyor      |
| Path Traversal                 | ✅    | User input'tan dosya yolu oluşturulmuyor; multer memoryStorage kullanıyor           |
| JWT Algorithm None Saldırısı   | ✅    | `jwt.verify()` explicit secret ile çağrılıyor; `algorithms` option eksik ama secret zorunlu |
| `eval()` kullanımı             | ✅    | Tüm kaynak dosyalarda `eval()` yok                                                  |
| CORS (management server)       | ✅    | `FRONTEND_URL` env var'a kısıtlı, `credentials: true` ile doğru yapılandırılmış    |
| Helmet middleware               | ✅    | `app.use(helmet())` management server'da aktif (CSP, HSTS, X-Frame-Options dahil)  |

---

## Semgrep JSON Çıktısı

Detaylı makine-okunabilir çıktı: `reports/semgrep-results.json`  
Text çıktısı: `reports/semgrep-results.txt`

---

## Düzeltme Öncelik Sırası

1. **S2** — Bot server CORS wildcard (1 satır fix, yüksek risk)
2. **S1** — Dockerfile USER direktifi (4 dosya, deployment güvenliği)
3. **S4** — Nginx H2C header (1 satır fix, nginx.conf)
4. **S3** — Seeder hardcoded password (env var refactor)
5. **S6** — JWT example secret güçlendirme (README + example güncelleme)
