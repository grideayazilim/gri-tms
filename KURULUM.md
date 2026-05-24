# Timesheet Management System — Kurulum ve Kullanım Kılavuzu

Bu belge projeyi sıfırdan ayağa kaldırmak için gereken **her adımı** içerir.  
İki ana senaryo vardır: **yerel geliştirme (dev)** ve **sunucu deploy (prod/test)**.

---

## Ön Gereksinimler (Herkeste Olması Gerekenler)

| Araç        | Minimum Versiyon | Kurulum                                                                                                                  |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Node.js** | v22+             | [nodejs.org](https://nodejs.org) veya `brew install node`                                                                |
| **Docker**  | v24+             | [Docker Desktop](https://docker.com/products/docker-desktop/) veya [OrbStack](https://orbstack.dev/) (Mac için önerilir) |
| **Git**     | herhangi         | `brew install git`                                                                                                       |

> **Not:** Bilgisayarınıza PostgreSQL kurmanıza **GEREK YOKTUR**. Veritabanı Docker'da çalışır.

> ⚠️ **ÖNEMLİ:** Eğer bilgisayarınızda **yerel PostgreSQL** kuruluysa (örneğin `brew install postgresql` ile), Docker konteyneriyle **port çakışması** yaşarsınız! Lokal Postgres port `5432`'yi tutar ve uygulamanız Docker yerine eski lokal DB'ye bağlanır. 

---

## Proje Yapısı

```
timesheet-management-system/
├── apps/
│   ├── management/           # Ana Uygulama (Timesheet Yönetim Paneli)
│   │   ├── client/           #   React frontend (Vite, port 5173)
│   │   ├── server/           #   Express backend (port 3000)
│   │   │   ├── .env          #   ← Ortam değişkenleri (Git'e eklenmez!)
│   │   │   └── database/     #   Migration, seed, schema dosyaları
│   │   └── shared/           #   Ortak tipler ve şemalar
│   └── bot/                  # Bot Sistemi (İŞKUR otomasyonu)
│       ├── client/           #   React frontend (Vite, port 3005)
│       └── server/           #   Express backend (port 3001)
├── docker/
│   ├── postgres/
│   │   └── 01-init.sh        # DB ilk kurulum scripti (otomatik çalışır)
│   └── backup/
│       ├── backup.sh         # Otomatik yedekleme (cron ile çalışır)
│       ├── restore.sh        # Yedekten geri yükleme (acil durum)
│       └── list-backups.sh   # Mevcut yedekleri listele
├── nginx/
│   └── nginx.conf            # Prod/test reverse proxy konfigürasyonu
├── docker-compose.yml        # DEV: Sadece PostgreSQL
├── docker-compose.prod.yml   # PROD: Tüm servisler
└── docker-compose.test.yml   # TEST: Tüm servisler
```

---

# 🖥️ BÖLÜM 1: Yerel Geliştirme Ortamı (Dev)

> **Konsept:** Veritabanı Docker'da çalışır, uygulama kodu (server + client) lokal terminalde çalışır.

## Adım 1: Projeyi Klonla

```bash
git clone <repo-url>
cd timesheet-management-system
```

## Adım 2: Bağımlılıkları Kur

```bash
npm install
```

Bu komut tüm workspace'lerdeki (`management/client`, `management/server`, `management/shared`, `bot/client`, `bot/server`) bağımlılıkları otomatik kurar.

## Adım 3: Ortam Değişkenlerini Ayarla

```bash
cp apps/management/server/.env.example apps/management/server/.env
```

`.env` dosyası hazır varsayılan değerlerle gelir — **hiçbir şeyi değiştirmeden kullanabilirsin.** İstersen şifreleri değiştirebilirsin ama değiştirmesen de çalışır.

> ⚠️ **Eğer `.env` dosyasındaki şifreleri değiştirirsen**, `DATABASE_URL` ve `MIGRATION_DATABASE_URL` satırlarındaki şifreleri de **aynı şekilde** güncellemeyi unutma!

## Adım 4: Veritabanını Başlat (Docker)

```bash
# Veritabanını arka planda başlat
docker compose up -d
```

İlk çalıştırmada Docker:
1. PostgreSQL 17 imajını indirir (sadece ilk sefer, ~80MB)
2. Veritabanını oluşturur (`timesheet_management_db`)
3. `app_user` ve `migration_user` kullanıcılarını oluşturur
4. ICU tr-TR locale ayarını yapar

Veritabanının hazır olduğunu kontrol et:

```bash
docker compose logs db
# Son satırda "database system is ready to accept connections" görmelisin
```

## Adım 5: Migration Çalıştır (Tablo Yapılarını Oluştur)

```bash
npm run db:migrate
```

Bu komut `apps/management/server/database/migrations/` altındaki SQL dosyalarını veritabanına uygular.

## Adım 6: Seed Çalıştır (İlk Verileri Yükle)

```bash
# Zorunlu: Admin kullanıcısı ve sistem ayarlarını oluşturur
npm run db:seed

# Opsiyonel: Demo/test verileri yükler (sahte kullanıcılar, timesheetler)
npm run db:seed:demo
```

Seed sonrası giriş bilgileri:
- **Kullanıcı adı:** `admin`
- **Şifre:** `1234`

## Adım 7: Uygulamayı Başlat

```bash
# Shared'ı build et
npm run build:shared

# Sadece Management uygulaması (server + client)
npm run dev:management

# Sadece Bot uygulaması (server + client)
npm run dev:bot

# Hepsini birden
npm run dev:all
```

Tarayıcında aç:
- **Management Client:** http://localhost:5173
- **Management Server API:** http://localhost:3000/api
- **Bot Client:** http://localhost:3005/bot/
- **Bot Server API:** http://localhost:3001

---

## Dev — Günlük Kullanım Cheatsheet

### Veritabanı Komutları

| Komut                       | Açıklama                                           |
| --------------------------- | -------------------------------------------------- |
| `docker compose up -d`      | DB'yi başlat (zaten çalışıyorsa bir şey olmaz)     |
| `docker compose down`       | DB'yi durdur (veri korunur)                        |
| `docker compose down -v`    | DB'yi **sil** (veri dahil, sıfırdan başlamak için) |
| `docker compose logs -f db` | DB loglarını canlı izle                            |
| `docker compose ps`         | Konteyner durumunu gör                             |

### Migration ve Seed Komutları

| Komut                  | Açıklama                                            |
| ---------------------- | --------------------------------------------------- |
| `npm run db:migrate`   | Bekleyen migrasyonları uygula                       |
| `npm run db:seed`      | Admin kullanıcısı + sistem ayarları oluştur         |
| `npm run db:seed:demo` | Demo verileri yükle                                 |
| `npm run db:generate`  | Şema değişikliklerinden yeni migration dosyası üret |
| `npm run db:studio`    | Drizzle Studio'yu aç (veritabanını görsel incele)   |

### Uygulama Komutları

| Komut                    | Açıklama                          |
| ------------------------ | --------------------------------- |
| `npm run dev:management` | Management server + client başlat |
| `npm run dev:bot`        | Bot server + client başlat        |
| `npm run dev:all`        | Her şeyi başlat                   |
| `npm run dev:server`     | Sadece Management server          |
| `npm run dev:client`     | Sadece Management client          |
| `npm run dev:bot-server` | Sadece Bot server                 |
| `npm run dev:bot-client` | Sadece Bot client                 |
| `npm run dev:shared`     | Shared paketi watch modunda derle |

### Veritabanına Doğrudan Bağlanma (Opsiyonel)

Eğer doğrudan SQL çalıştırmak istersen:

```bash
# Docker konteynerine bağlan ve psql aç
docker exec -it tms_db_dev psql -U postgres -d timesheet_management_db
```

Bazı faydalı psql komutları:

```sql
\dt app.*          -- Tabloları listele
\d app.users       -- users tablosunun yapısını gör
SELECT * FROM app.users;  -- Kullanıcıları listele
\q                 -- Çık
```

### Veritabanını Sıfırlama (Her Şeyi Baştan Yapmak)

```bash
docker compose down -v        # DB konteynerini ve verisini sil
docker compose up -d           # Yeniden oluştur
npm run db:migrate             # Tabloları oluştur
npm run db:seed                # Admin + ayarlar
npm run db:seed:demo           # (opsiyonel) demo veri
```

### Şema Değişikliği Yaptığında (Yeni Kolon, Tablo vs.)

1. `apps/management/server/database/schema.ts` dosyasını düzenle
2. Migration dosyası üret:
   ```bash
   npm run db:generate
   ```
3. Üretilen SQL'i incele: `apps/management/server/database/migrations/` altında yeni dosya oluşur
4. Migration'ı uygula:
   ```bash
   npm run db:migrate
   ```

---

# 🚀 BÖLÜM 2: Sunucu Deploy (Prod / Test)

> **Konsept:** Sunucuda her şey (DB + Server + Client + Bot + Nginx) Docker içinde çalışır. Sunucuya Node.js bile kurmana gerek yok.

## Sunucu Gereksinimleri

| Gereksinim         | Minimum                         |
| ------------------ | ------------------------------- |
| **Docker**         | v24+                            |
| **Docker Compose** | v2+ (Docker ile birlikte gelir) |
| **RAM**            | 2 GB+                           |
| **Disk**           | 10 GB+                          |

## Production Deploy

### Adım 1: Projeyi Sunucuya Al

```bash
git clone <repo-url>
cd timesheet-management-system
```

### Adım 2: Ortam Değişkenlerini Ayarla

```bash
cp apps/management/server/.env.prod.example apps/management/server/.env.prod
```

**`.env.prod` dosyasını aç ve TÜM şifreleri güçlü şifrelerle değiştir:**

```bash
nano apps/management/server/.env.prod
```

Değiştirilmesi **ZORUNLU** olan satırlar:

```env
POSTGRES_PASSWORD=GUCLU_BIR_SIFRE_YAZ           # PostgreSQL superuser şifresi
DB_SUPER_PASSWORD=GUCLU_BIR_SIFRE_YAZ           # Yukarıdakiyle AYNI olmalı
DB_APP_PASSWORD=FARKLI_GUCLU_SIFRE              # Uygulama kullanıcı şifresi
DB_MIGRATION_PASSWORD=FARKLI_GUCLU_SIFRE_2      # Migration kullanıcı şifresi
ACCESS_TOKEN_SECRET=EN_AZ_32_KARAKTER_RASTGELE  # JWT access token
REFRESH_TOKEN_SECRET=FARKLI_32_KARAKTER         # JWT refresh token
FRONTEND_URL=http://SUNUCU_IP_ADRESI            # veya domain adı
```

> ⚠️ `DATABASE_URL` ve `MIGRATION_DATABASE_URL` satırlarındaki şifreleri de güncelle!  
> ⚠️ `DB_HOST=postgres` olarak kalmalı (Docker ağ adı). **localhost yazmayın!**

### Adım 3: Deploy Et

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Bu komut:
1. Tüm servisleri (Postgres, Server, Client, Bot Server, Bot Client) build eder
2. PostgreSQL başlar → init script çalışır (DB + kullanıcılar oluşur)
3. Server başlar → migration otomatik çalışır + şema izinleri verilir
4. Client (Nginx) başlar → frontend serve edilir + API proxy yapılır
5. Bot servisleri başlar

**İlk deploy'da admin ve seed verileri yüklemek için:**

```bash
# Server konteynerine bağlan ve seed çalıştır
docker compose -f docker-compose.prod.yml exec server node dist/database/seeder.js
```

### Adım 4: Çalıştığını Doğrula

```bash
# Tüm servislerin durumunu gör
docker compose -f docker-compose.prod.yml ps

# Tüm servislerin loglarını izle
docker compose -f docker-compose.prod.yml logs -f

# Sadece belirli bir servisin loglarını izle
docker compose -f docker-compose.prod.yml logs -f server
```

Tarayıcıda `http://SUNUCU_IP` adresini aç → Management paneli gelecektir.

---

## Test Deploy

Test ortamı production ile neredeyse aynı, sadece farklı env dosyası ve compose dosyası kullanır.

### Adım 1: Ortam Değişkenlerini Ayarla

```bash
cp apps/management/server/.env.test.example apps/management/server/.env.test
nano apps/management/server/.env.test
# Şifreleri güncelle (prod ile aynı mantık)
```

### Adım 2: Deploy Et

```bash
docker compose -f docker-compose.test.yml up -d --build
```

### Adım 3: İlk Seed

```bash
docker compose -f docker-compose.test.yml exec server node dist/database/seeder.js
```

> **Not:** Test ortamında demo verileri de yükleyebilirsin:
> ```bash
> docker compose -f docker-compose.test.yml exec server node dist/database/seeder-demo.js
> ```

---

## Prod/Test — Günlük Yönetim Cheatsheet

> Aşağıdaki komutlarda `COMPOSE_FILE` yerine kullandığın dosyayı yaz:
> - **Production:** `-f docker-compose.prod.yml`
> - **Test:** `-f docker-compose.test.yml`

### Servis Yönetimi

| Komut                                            | Açıklama                                     |
| ------------------------------------------------ | -------------------------------------------- |
| `docker compose -f <DOSYA> up -d --build`        | Tüm servisleri build edip başlat             |
| `docker compose -f <DOSYA> up -d --build server` | Sadece server'ı yeniden build et             |
| `docker compose -f <DOSYA> down`                 | Tüm servisleri durdur (veri korunur)         |
| `docker compose -f <DOSYA> down -v`              | Tüm servisleri durdur + **veritabanını sil** |
| `docker compose -f <DOSYA> restart server`       | Sadece server'ı yeniden başlat               |
| `docker compose -f <DOSYA> ps`                   | Servislerin durumunu gör                     |

### Log İzleme

| Komut                                              | Açıklama                     |
| -------------------------------------------------- | ---------------------------- |
| `docker compose -f <DOSYA> logs -f`                | Tüm logları canlı izle       |
| `docker compose -f <DOSYA> logs -f server`         | Sadece server loglarını izle |
| `docker compose -f <DOSYA> logs -f postgres`       | Sadece DB loglarını izle     |
| `docker compose -f <DOSYA> logs --tail 100 server` | Son 100 satır log            |
| `docker compose -f <DOSYA> logs -f server client`  | Birden fazla servis          |

### Veritabanı İşlemleri (Sunucuda)

```bash
# Veritabanına doğrudan bağlan
docker compose -f <DOSYA> exec postgres psql -U postgres -d timesheet_management_db

# Seed çalıştır (admin kullanıcısı)
docker compose -f <DOSYA> exec server node dist/database/seeder.js

# Demo seed çalıştır
docker compose -f <DOSYA> exec server node dist/database/seeder-demo.js
```

> **Not:** Migration sunucuda otomatik çalışır — server konteyneri başlarken `docker-entrypoint.sh` migration'ı otomatik uygular. Manuel çalıştırmana gerek yok.

### Güncelleme (Yeni Kod Deploy)

```bash
cd timesheet-management-system
git pull                                            # Yeni kodu çek
docker compose -f <DOSYA> up -d --build             # Yeniden build et ve başlat
docker compose -f <DOSYA> logs -f server            # Logları izle, hata var mı kontrol et
```

Migration otomatik çalışacaktır — yeni bir migration varsa server başlarken uygulanır.

### Veritabanı Yedeği Alma

Otomatik yedekleme için `docker/backup/` klasöründeki scriptleri kullan.  
Detaylı yedekleme ve geri yükleme rehberi için **Bölüm 3**'e bak.

### Acil Durum: Her Şeyi Sıfırla

```bash
docker compose -f <DOSYA> down -v          # Her şeyi sil
docker compose -f <DOSYA> up -d --build    # Sıfırdan kur
# Admin seed'i sunucuda otomatik çalışmaz, manuel çalıştır:
docker compose -f <DOSYA> exec server node dist/database/seeder.js
```

---

## Portlar Özet Tablosu

| Servis            | Dev (Lokal)      | Prod/Test (Docker)         |
| ----------------- | ---------------- | -------------------------- |
| Management Client | `localhost:5173` | `localhost:80` (Nginx)     |
| Management Server | `localhost:3000` | Nginx proxy → `:3000` (iç) |
| Bot Client        | `localhost:3005` | Nginx proxy → `:80` (iç)   |
| Bot Server        | `localhost:3001` | Nginx proxy → `:3001` (iç) |
| PostgreSQL        | `localhost:5432` | Sadece iç ağda `:5432`     |

---

## Sık Karşılaşılan Sorunlar

### "Port 5432 zaten kullanılıyor"
Bilgisayarında yerel PostgreSQL yüklü olabilir. Kapat veya kaldır:
```bash
# macOS'ta brew ile kurulmuşsa
brew services stop postgresql
```

### "Docker compose up çalışmıyor"
Docker Desktop veya OrbStack'in çalıştığından emin ol:
```bash
docker info   # Docker daemon çalışıyor mu?
```

### "Migration hatası: role does not exist"
DB konteyneri ilk kez çalışmamış veya init script atlanmış olabilir. Sıfırla:
```bash
docker compose down -v
docker compose up -d
# Birkaç saniye bekle, sonra:
npm run db:migrate
```

### "ECONNREFUSED - veritabanına bağlanamıyorum"
1. Docker konteyneri çalışıyor mu kontrol et: `docker compose ps`
2. `.env` dosyasında `DB_HOST=localhost` olduğundan emin ol (dev ortamı için)
3. Port doğru mu: `DB_PORT=5432`

### Prod'da "502 Bad Gateway"
Server konteyneri henüz başlamamış olabilir. Logları kontrol et:
```bash
docker compose -f docker-compose.prod.yml logs -f server
```

---

# 💾 BÖLÜM 3: Otomatik Yedekleme ve Geri Yükleme

> **Konsept:** Her gece otomatik yedek alınır, eski yedekler silinir (30 gün). Bir sorun olursa tek komutla geri dönülür.

## Script'ler

| Dosya | Açıklama |
|---|---|
| `docker/backup/backup.sh` | Yedek al (her gece cron ile çalışır) |
| `docker/backup/restore.sh` | Yedekten geri yükle (acil durumda) |
| `docker/backup/list-backups.sh` | Mevcut yedekleri listele |

## Kurulum (Sunucuda Bir Kez)

### 1. Script'lere çalıştırma izni ver

```bash
chmod +x docker/backup/backup.sh
chmod +x docker/backup/restore.sh
chmod +x docker/backup/list-backups.sh
```

### 2. Yedek klasörünü oluştur

```bash
sudo mkdir -p /var/backups/timesheet
sudo chown $USER:$USER /var/backups/timesheet
```

### 3. Cron job'ı kur (her gece 03:00)

```bash
crontab -e
```

Açılan editöre şunu ekle (yolu kendi sunucuna göre ayarla):

```
0 3 * * * /home/ubuntu/timesheet-management-system/docker/backup/backup.sh >> /var/log/timesheet-backup.log 2>&1
```

### 4. Test et (hemen bir yedek al)

```bash
./docker/backup/backup.sh
```

Çıktıda şunu görmelisin:
```
[BACKUP 2026-05-24 03:00:00] Yedekleme başladı → /var/backups/timesheet/timesheet_2026-05-24_03-00.sql.gz
[BACKUP 2026-05-24 03:00:01] Yedekleme başarılı. Boyut: 2.1 MB
[BACKUP 2026-05-24 03:00:01] Toplam 1 backup mevcut.
```

---

## Yedekleri Listeleme

```bash
./docker/backup/list-backups.sh
```

```
════════════════════════════════════════════════════════
  Mevcut Backuplar
════════════════════════════════════════════════════════

  Dosya Adı                                   Boyut   Tarih
  ─────────────────────────────────────────   ──────  ───────────────────
  timesheet_2026-05-24_03-00.sql.gz           2.1 MB  2026-05-24 03:00
  timesheet_2026-05-23_03-00.sql.gz           2.0 MB  2026-05-23 03:00

  Toplam: 2 backup, 4.1 MB disk alanı
════════════════════════════════════════════════════════
```

---

## ⚠️ Geri Yükleme (Disaster Recovery)

> **DİKKAT:** Bu işlem mevcut veritabanını **tamamen silip** yedeği geri yükler. Geri dönüşü yoktur.

### Adım 1: Mevcut yedekleri gör

```bash
./docker/backup/list-backups.sh
```

### Adım 2: İstediğin yedeği geri yükle

```bash
./docker/backup/restore.sh timesheet_2026-05-23_03-00.sql.gz
```

Script senden **"evet"** yazmanı isteyecek, sonra:
1. Uygulama sunucusunu durdurur
2. Veritabanını siler ve yeniden oluşturur
3. Yedeği içe aktarır
4. Uygulama sunucusunu yeniden başlatır

```
════════════════════════════════════════════════════════
  ✅ Geri yükleme tamamlandı!
  Geri yüklenen backup: timesheet_2026-05-23_03-00.sql.gz
  Sistem tekrar kullanıma hazır.
════════════════════════════════════════════════════════
```

---

## Özelleştirme

Script'lerin davranışını env variable ile değiştirebilirsin:

```bash
# Farklı klasöre yedekle
BACKUP_DIR=/mnt/nas/backups ./docker/backup/backup.sh

# Daha uzun süre sakla (60 gün)
RETENTION_DAYS=60 ./docker/backup/backup.sh
```

Kalıcı değiştirmek için crontab satırına ekle:

```
0 3 * * * BACKUP_DIR=/mnt/nas/backups RETENTION_DAYS=60 /home/ubuntu/timesheet-management-system/docker/backup/backup.sh >> /var/log/timesheet-backup.log 2>&1
```

---

## Cron Log İzleme

```bash
# Backup loglarını izle
tail -f /var/log/timesheet-backup.log

# Son backup başarılı mıydı?
tail -5 /var/log/timesheet-backup.log
```
