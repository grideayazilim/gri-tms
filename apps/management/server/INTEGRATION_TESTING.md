# Integration Testing Kılavuzu — Timesheet Management System

**Sorumlu:** Elçin  
**Branch:** `test/management-integration`  
**Framework:** Vitest + Supertest  
**Test Sayısı:** 12 dosya, ~110 test case

---

## Genel Bakış

Bu kılavuz, Management uygulamasının API endpoint'lerini test eden **integration test suite**'ini açıklar.
Testler gerçek bir PostgreSQL veritabanına karşı çalışır; her test suite başlamadan önce veritabanı temizlenir.

### Mimari

```
apps/management/server/
├── vitest.integration.config.ts    ← Integration test Vitest yapılandırması
├── tests/
│   ├── integration/
│   │   ├── setup.ts                ← Global DB bağlantısı + teardown
│   │   ├── auth.test.ts            ← Auth akışları (12 test)
│   │   ├── user.test.ts            ← User CRUD (10 test)
│   │   ├── employee.test.ts        ← Employee CRUD (11 test)
│   │   ├── timesheet.test.ts       ← Timesheet akışları (11 test)
│   │   ├── export.test.ts          ← Excel export (9 test)
│   │   ├── import.test.ts          ← Excel/data import (10 test)
│   │   ├── holiday.test.ts         ← Tatil günleri (9 test)
│   │   ├── announcement.test.ts    ← Duyurular (12 test)
│   │   ├── locationUnit.test.ts    ← Lokasyon & Birim (11 test)
│   │   ├── auditLog.test.ts        ← Audit loglar (11 test)
│   │   ├── authorization.test.ts   ← Yetkilendirme + Rate limit (9 test)
│   │   └── settings.test.ts        ← Sistem ayarları (11 test)
│   └── helpers/
│       ├── testDb.ts               ← DB seed yardımcı fonksiyonları
│       └── testFactory.ts          ← Faker mock data üreticileri
```

---

## Ön Gereksinimler

- Docker Desktop kurulu ve çalışıyor
- Node.js 20+
- `apps/management/server/.env.test` dosyası mevcut

---

## Kurulum

### 1. `.env.test` Oluştur

```bash
cp apps/management/server/.env.test.example apps/management/server/.env.test
```

Değerleri kontrol et (varsayılan değerler local Docker için hazır):

```env
DB_HOST=localhost
DB_PORT=5434          # Test DB farklı port kullanıyor
DB_NAME=timesheet_management_db
DB_APP_USER=app_user
DB_APP_PASSWORD=app_local_password
ACCESS_TOKEN_SECRET=test-access-secret-min32chars-padding
REFRESH_TOKEN_SECRET=test-refresh-secret-min32chars-pad
```

> **Not:** Test DB için ayrı port (5434) kullanmak development DB (5432) ile çakışmayı önler.
> `docker-compose.test.yml`'de `ports: "5434:5432"` şeklinde ayarla.

### 2. Paketleri Kur

```bash
# Proje kökünden
npm install
```

---

## Test Ortamını Başlatma

### Adım 1: Test PostgreSQL'i Başlat

```bash
# Proje kökünden — sadece postgres servisini başlat
docker compose -f docker-compose.test.yml up -d postgres

# Hazır olmasını bekle
docker compose -f docker-compose.test.yml ps
```

PostgreSQL container'ı `healthy` durumuna geçene kadar bekle.

### Adım 2: Migration'ları Çalıştır

Test DB'ye migration uygula:

```powershell
# .env.test değerleriyle migration çalıştır
$env:DB_HOST="localhost"
$env:DB_PORT="5434"
$env:MIGRATION_DATABASE_URL="postgresql://migration_user:migration_local_password@localhost:5434/timesheet_management_db"
npm run db:migrate -w management-server
```

Veya `.env.test` dosyasındaki değerleri kullanarak:

```bash
# Linux/Mac
DB_HOST=localhost DB_PORT=5434 MIGRATION_DATABASE_URL=... npm run db:migrate -w management-server
```

### Adım 3: Testleri Çalıştır

```bash
# Proje kökünden — integration testleri çalıştır
npm run test:integration -w management-server

# Watch mode (geliştirme sırasında)
npm run test:integration:watch -w management-server

# Unit + Integration birlikte
npm run test:all -w management-server
```

---

## Sadece Belirli Bir Test Dosyası Çalıştırma

```bash
# Proje kökünden
npx vitest run --config apps/management/server/vitest.integration.config.ts \
  apps/management/server/tests/integration/auth.test.ts

# Server dizininden
cd apps/management/server
npx vitest run --config vitest.integration.config.ts tests/integration/auth.test.ts
```

---

## Test Stratejisi

### DB Temizleme

Her test suite (describe bloğu) `beforeEach`'te `cleanDb()` çağırır:

```typescript
beforeEach(async () => {
  await cleanDb()
  // İsteğe bağlı: seed data ekle
  await createSettings()
})
```

`cleanDb()` şu sırayla tüm tabloları temizler:
1. `timesheet_days` → `timesheets` → `periods`
2. `announcement_reads` → `announcements`
3. `employees`
4. `audit_logs`
5. `users`
6. `units` → `locations`
7. `settings`

### Auth Yönetimi

Testler cookie-based auth kullanır. `testDb.ts`'deki yardımcı fonksiyonlar JWT token üretir:

```typescript
const admin = await createAdminUser()
// admin.cookie = "accessToken=eyJ..." formatında

await request(app)
  .get('/api/users')
  .set('Cookie', admin.cookie)
```

### Test Pattern

Her dosyada dört describe bloğu:

```typescript
describe('Endpoint Adı', () => {
  describe('Başarılı senaryolar (happy path)', () => { ... });
  describe('Hata senaryoları (validation)', () => { ... });
  describe('Yetkilendirme', () => { ... });
  describe("Edge case'ler", () => { ... });
});
```

---

## Test Dosyaları Özeti

| # | Dosya | Endpoint Grubu | Test Sayısı |
|---|-------|---------------|-------------|
| 1 | `auth.test.ts` | `/api/auth/*` | 12 |
| 2 | `user.test.ts` | `/api/users/*` | 10 |
| 3 | `employee.test.ts` | `/api/employees/*` | 12 |
| 4 | `timesheet.test.ts` | `/api/timesheets/*` | 11 |
| 5 | `export.test.ts` | `/api/export/*` | 9 |
| 6 | `import.test.ts` | `/api/import/*` | 10 |
| 7 | `holiday.test.ts` | `/api/holidays` | 9 |
| 8 | `announcement.test.ts` | `/api/announcements/*` | 12 |
| 9 | `locationUnit.test.ts` | `/api/locationAndUnits/*` | 11 |
| 10 | `auditLog.test.ts` | `/api/audit-logs` | 11 |
| 11 | `authorization.test.ts` | Tüm endpoint'ler (rol testi) | 9 |
| 12 | `settings.test.ts` | `/api/settings/*` | 11 |

**Toplam:** ~117 test case

---

## Notlar

### Holiday Endpoint Kısıtı

Mevcut uygulamada tatil yönetimi için yalnızca `GET /api/holidays` endpoint'i bulunmaktadır.
Tatil ekleme, güncelleme ve silme endpoint'leri uygulanmamıştır.
Bu nedenle `holiday.test.ts` yalnızca GET akışını test eder.

### Rate Limit Testi

`authorization.test.ts`'teki rate limit testi (21+ istek → 429) varsayılan olarak 60 saniye timeout ile çalışır.
Bu test yavaş olabilir; CI'da ayrı çalıştırmak istersen:

```bash
npx vitest run --config vitest.integration.config.ts tests/integration/authorization.test.ts
```

### Test Ortamı ve Dev Ortamı

Integration testler `NODE_ENV=test` ile çalışır. Bu:
- Rate limiter'ı etkilemez (davranış aynı kalır)
- Cookie'lerin `Secure` flag'ini devre dışı bırakır

---

## Temizlik

Testler bitince test container'ını durdur:

```bash
docker compose -f docker-compose.test.yml down
# Veya volume'ları da sıfırlamak için:
docker compose -f docker-compose.test.yml down -v
```

---

## Sorun Giderme

### "Test DB bağlantısı kurulamadı"

PostgreSQL container'ının çalıştığından emin ol:
```bash
docker compose -f docker-compose.test.yml ps
```

### "relation app.users does not exist"

Migration çalıştırılmamış. Adım 2'yi tekrar yap.

### "Cannot find module '../../../src/app.js'"

Dosya yolunu kontrol et. `vitest.integration.config.ts`'in `apps/management/server/` içinde olduğundan emin ol.

### "Access token secret is required"

`.env.test` dosyasında `ACCESS_TOKEN_SECRET` ve `REFRESH_TOKEN_SECRET` değerlerini kontrol et.
Vitest bunları `loadEnv()` ile okur.
