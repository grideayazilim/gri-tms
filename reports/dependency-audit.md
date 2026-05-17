# Dependency Audit Raporu

**Tarih:** 2026-05-17  
**Araç:** `npm audit --audit-level=high` + Trivy v0.70.0 filesystem scan  
**Kapsam:** Tüm workspace paketleri (management/server, management/client, bot/server, bot/client)

---

## Özet

| Seviye    | Sayı | Durum                           |
|-----------|------|---------------------------------|
| CRITICAL  | 0    | ✅ Temiz                        |
| HIGH      | 14+  | ❌ Düzeltme gerekiyor           |
| MODERATE  | 4    | ⚠️ Dev-only, production riski yok |

---

## HIGH Bulgular

### 1. `xlsx` 0.18.5 — CVE-2023-30533 + CVE-2024-22363 ❌

| Alan         | Değer                                                                      |
|--------------|----------------------------------------------------------------------------|
| Paket        | `xlsx@0.18.5`                                                              |
| Kullanım     | `apps/management/client` (Excel import), `apps/bot/server` (Excel parse)  |
| CVE-1        | CVE-2023-30533 — **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)            |
| CVE-2        | CVE-2024-22363 — **ReDoS** (GHSA-5pgg-2g8v-p4x9)                          |
| npm fix      | **Yok** — `npm audit fix` çalışmıyor                                       |
| Trivy fix    | CVE-2023-30533 → `0.19.3`; CVE-2024-22363 → `0.20.2` (npm'de publish yok) |

**Risk:** Kullanıcı tarafından yüklenen kötü niyetli bir Excel dosyası prototype pollution veya ReDoS saldırısına yol açabilir. Management client'ta `BulkImportView.tsx`'de kullanıcı yüklemesi doğrudan tarayıcıda yapılıyor (XLSX.read), bu nedenle server-side risk yok. Bot server'da server-side parsing var — ReDoS ile hizmet kesintisi mümkün.

**Aksiyon:**
- `apps/management/client`: `xlsx` → `exceljs` ile değiştir (management/server'da zaten `exceljs` kullanılıyor, tutarlılık sağlanır)
- `apps/bot/server`: `xlsx` → `exceljs` veya forks olan `@e965/xlsx` ile değiştir (CVE'ler giderilmiş fork)

---

### 2. `multer` 1.4.5-lts.2 — Multiple DoS CVEs ❌

| Alan     | Değer                                          |
|----------|------------------------------------------------|
| Paket    | `multer@1.4.5-lts.2`                           |
| Kullanım | `apps/bot/server` (Excel dosya upload)         |
| CVEs     | CVE-2025-47935, CVE-2025-47944, CVE-2025-48997, CVE-2025-7338, CVE-2026-2359, CVE-2026-3304, CVE-2026-3520 |
| Fix      | `multer@2.1.1` ile tümü gideriliyor            |

**Risk:** Kötü niyetli multipart istekleri ile Denial of Service (unclosed streams, malformed requests).

**Aksiyon:**
```bash
cd apps/bot/server && npm install multer@^2.1.1
```
> Not: multer v2 API'sinde küçük breaking changes var, bot server upload kodunu gözden geçir.

---

### 3. `axios` 1.13.x — Prototype Pollution & HTTP Hijacking ❌

| Alan     | Değer                                                          |
|----------|----------------------------------------------------------------|
| Paket    | `axios@1.13.6` (bot/server), `axios@1.13.5` (bot/client içinde) |
| CVE-1    | CVE-2026-42033 — HTTP Transport Hijacking via Prototype Pollution |
| CVE-2    | CVE-2026-42035 — Arbitrary HTTP header injection              |
| CVE-3    | CVE-2026-42043 — NO_PROXY bypass via crafted URL              |
| CVE-4    | CVE-2026-42264 — Ek güvenlik açığı                            |
| Fix      | `axios@1.15.2`                                                |

**Aksiyon:**
```bash
cd apps/bot/server && npm install axios@^1.15.2
```

---

### 4. `@babel/plugin-transform-modules-systemjs` 7.29.0 — CVE-2026-44728 ❌

| Alan     | Değer                                                         |
|----------|---------------------------------------------------------------|
| Paket    | Babel plugin — `apps/bot/client` build dependency            |
| CVE      | CVE-2026-44728 — Malicious input'tan arbitrary code generate |
| Fix      | `7.29.4` veya `8.0.0-alpha.13`                               |

**Risk:** Build-time risk — production'da çalışmıyor. Ancak CI pipeline'da kötü niyetli bağımlılık zinciri üzerinden kod injection mümkün.

**Aksiyon:** `apps/bot/client` paket bağımlılıklarını güncelle.

---

### 5. `fast-uri` 3.1.0 — CVE-2026-6321 + CVE-2026-6322 ❌

| Alan     | Değer                                               |
|----------|-----------------------------------------------------|
| Paket    | `fast-uri@3.1.0` — bot/client transitive dependency |
| CVE-1    | CVE-2026-6321 — Path traversal, security policy bypass |
| CVE-2    | CVE-2026-6322 — Percent-encoded authority normalization |
| Fix      | `3.1.1` → `3.1.2`                                  |

---

## MODERATE Bulgular (Dev-only, Production Riski Yok)

### `drizzle-kit` → `esbuild ≤0.24.2` — GHSA-67mh-4wv8-2f99

| Alan     | Değer                                                        |
|----------|--------------------------------------------------------------|
| Paket    | `drizzle-kit@0.31.10` → `@esbuild-kit` → `esbuild ≤0.24.2` |
| Seviye   | MODERATE                                                     |
| Sorun    | Esbuild dev server başka web sitelerinden istek kabul edebilir |
| Risk     | **Sadece development ortamında**, üretimde esbuild çalışmıyor |

**`npm audit fix --force` uygulanmadı** — `drizzle-kit@0.18.1`'e downgrade yapacak, breaking change.  
**Aksiyon:** `drizzle-kit` stable bir versiyona güncellenerek esbuild bağımlılığı çözüldüğünde kendiliğinden kapanacak. Dev ortamında güvenli bir ağ kullanıldığı sürece kabul edilebilir.

---

## npm audit fix Sonuçları

`npm audit fix` (no force): **0 vulnerability otomatik düzeldi** — tüm bulgular ya breaking change gerektiriyor ya da `npm` kayıt defterinde fix yok.

Manuel aksiyon gerektiren paketler:
- `xlsx` → exceljs ile replace
- `multer` → `^2.1.1` upgrade
- `axios` → `^1.15.2` upgrade

---

## Çıktı Dosyaları

- `reports/dependency-audit.md` (bu dosya)
- `reports/trivy-server.txt` — Trivy filesystem scan (text)
- `reports/trivy-server.html` — Trivy filesystem scan (HTML)
