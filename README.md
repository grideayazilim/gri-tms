<img width="3525" height="597" alt="splash" src="https://github.com/user-attachments/assets/ff01a052-855a-4460-90c1-ef6ebedd537f" />



# 📊 griTMS: İŞKUR Gençlik Programı İçin Puantaj Yönetim Sistemi ve E-Şube Botu

[![Gridea](https://img.shields.io/badge/Geli%C5%9Ftirici-Gridea-FF6B6B?style=for-the-badge&logo=github)](https://github.com/grideayazilim)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

Timesheet Management System (TMS); **İŞKUR Gençlik Programı** kapsamında eğitim kurumlarında istihdam edilen öğrencilerin çalışma saatlerini, devam durumlarını ve puantaj verilerini tek bir merkezden yöneten ve verileri **İŞKUR E-Şube** sistemine otomatik işleyen entegre bir otomasyon platformudur. Projenin kararlılığı ve güvenilirliği; unit, integration ve Playwright tabanlı E2E test senaryolarında %80'e varan coverage ile teminat altına alınmıştır.

---

## 🎬 Uygulama Tanıtım Demosu

Uygulamanın arayüzünü, kullanım akışını ve genel işleyişini aşağıdaki demo videodan inceleyebilirsiniz:

<video src="https://github.com/user-attachments/assets/838aabe5-d9a7-4e15-b7de-1ca51e38976b" width="100%" autoplay loop muted playsinline></video>

---

## 📌 TMS ile Çözülen Problemler

* **Merkezi Tek Tablo Yönetimi:** Tüm yetkili personeller (Birim Sorumluları) ve sistem yöneticileri (Admin), puantaj verilerini tek bir veritabanına ekran üzerinden anlık olarak sisteme işler.
* **5 Günlük Otomatik Kilitleme Mekanizması:** İlgili ay tamamlandıktan sonra, veri giriş tablosu **5. günün sonunda otomatik olarak kilitlenir**. Bu süre sınırlandırması, sorumluların elini çabuk tutmasını sağlayarak sürecin aksamasını kesin olarak önler.
* **Akıllı İŞKUR Entegrasyon Botu:** Yerleşkelerdeki öğrencilerin verilerini İŞKUR sistemine elle girmek yerine, sistemden tek tıkla alınan Excel bot çıktısı İŞKUR Otomasyon Botuna yüklenir. Playwright tabanlı bot, İŞKUR portalına otomatik bağlanarak tüm kayıtları hatasız ve hızlıca sisteme girer.
* **Gelişmiş Rol ve Güvenlik Yetkilendirme (RBAC):** Sorumlular sadece yetkili oldukları birimlerin verilerine erişebilir. Güvenli API katmanı ve veri izolasyonu sayesinde hiçbir kullanıcı yetkisi dışındaki kayıtlara erişemez.
* **İşlem Geçmişi:** Sistem üzerindeki her veri girişi, düzenleme ve silme işlemi kimlik bilgileriyle kaydedilir ve **İşlem Kayıtları** sayfasından canlı olarak izlenebilir. 

  * _Sistem hataları vb. loglar Docker'da tutulur. Gerektiğinde root cause için Docker üzerinden incelenebilir: `docker compose logs -f server/client/...`_

---

## 🛠️ Tech Stack

### 💻 Frontend
* ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) — Modern ve dinamik kullanıcı arayüzü bileşenleri.
* ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) — Tip güvenliği ve hatasız geliştirme süreci.
* ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) — Hızlı derleme ve modern geliştirme sunucusu.
* ![Sass](https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white) — Esnek ve modüler stil yönetimi.
* ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white) — Akıcı mikro-animasyonlar ve geçiş efektleri.
* ![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white) — Şema tabanlı form ve API veri doğrulama.

### ⚙️ Backend & Otomasyon
* ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) — Ölçeklenebilir JavaScript çalışma ortamı.
* ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) — Minimalist ve hızlı API yönlendirme katmanı.
* ![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white) — İŞKUR E-Şube otomasyon botu için tarayıcı simülasyonu.
* ![ExcelJS](https://img.shields.io/badge/ExcelJS-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white) — Bot ile uyumlu şablonlarda Excel okuma/yazma motoru.

### 💾 Veri & Altyapı
* ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) — Güçlü ilişkisel veritabanı (Docker üzerinde çalışır).
* ![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black) — SQL performansı sunan modern TypeScript ORM katmanı.
* ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) — Geliştirme ve canlı ortamlar için container ortamı.
* ![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white) — Canlı ortamda ters proxy (Reverse Proxy) ve statik dosya sunumu.

---

## 🎥 Videolu Arayüz Kılavuzları (Info Box)

Sistem genelinde sayfaların üst menülerinde bulunan soru işaretli **Info Box** butonları, kullanıcıların ilgili sayfayı nasıl kullanması gerektiğini anlatan rehber videoları açar. Bu sayede kullanıcılar harici bir dokümana ihtiyaç duymadan sistemi kendi kendilerine hızlıca öğrenebilirler.

Rehber videoların kullanım şeklini aşağıdaki önizlemeden inceleyebilirsiniz:

<video src="https://github.com/user-attachments/assets/ce0a75d3-6795-4a9c-b3a2-77934c00be49" width="100%" autoplay loop muted playsinline></video>

---

## 👥 Katkıda Bulunanlar (Contributors)

Bu projeyi geliştirmede emeği geçen herkese teşekkürler 🙏

<a href="https://github.com/grideayazilim/gri-tms/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=grideayazilim/gri-tms" />
</a>

---

## 🚀 KURULUM ve HIZLI BAŞLANGIÇ

> 🪟 **Windows Kullanıcıları İçin Kritik Ön Bilgiler:**
> * **OneDrive Uyarısı:** Eğer proje klasörü OneDrive veya OneDrive altındaki bir klasör içindeyse Docker senkronizasyon sorunları nedeniyle düzgün çalışmaz. Projeyi `C:\` gibi bir konuma taşımanız önerilir. Projenizin nerede olduğunu kontrol etmek için terminalde `pwd` komutunu çalıştırabilirsiniz.
> * **Komut Farklılıkları:** Aşağıdaki adımlarda bulunan `cp` (kopyalama) komutları Windows Command Prompt (CMD) üzerinde `copy`, PowerShell üzerinde ise `Copy-Item` olarak değiştirilmelidir.
> * **Port Çakışması (Hata: `Port 5432 is already in use`):** Eğer bilgisayarınızda lokal bir PostgreSQL servisi çalışıyorsa Docker veritabanı container'ı başlamaz. Çözmek için PowerShell'i *Yönetici olarak* açıp `Stop-Service -Name postgresql*` yazarak yerel servisi durdurmalısınız. Portu kullanan süreci bulmak için ise CMD'de `netstat -ano | findstr :5432` çalıştırabilirsiniz.
> * **Yedekleme ve Geri Yükleme:** Yedekleme betikleri `.sh` uzantılıdır. Bunları Windows'ta çalıştırabilmek için **Git Bash** terminalini kullanmanız gerekmektedir.

---

### 🖥️ 1. Yerel Geliştirme Ortamı (Local Development)

Sadece veritabanının Docker'da, uygulamaların (client & server) ise yerel terminalde çalıştırıldığı senaryodur.

#### 📋 Gereksinimler
* **Node.js:** v22+
* **Docker:** v24+
* **Git:** Herhangi bir sürüm

```bash
# 1. Projeyi klonlayın ve kök dizine geçin
git clone https://github.com/grideayazilim/gri-tms.git
cd gri-tms

# 2. Tüm workspace bağımlılıklarını tek komutla kurun
npm install

# 3. Ortam değişkenlerini kopyalayın
cp apps/management/server/.env.example apps/management/server/.env

# 4. Veritabanını Docker ile arka planda başlatın
docker compose up -d

# 5. Veritabanı şemasını uygulayın ve seed verilerini yükleyin
npm run db:migrate
npm run db:seed
npm run db:seed:demo  # Opsiyonel: Test verileri için

# 6. Ortak paketleri derleyip tüm sistemi başlatın
npm run build:shared
npm run dev:all
```
* **Yönetim Arayüzü:** [http://localhost:5173](http://localhost:5173) (Giriş: `admin` / `1234`)

```bash
# Veritabanını sıfırlamak için (sırayla)
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
```

---

### 🌐 2. Canlıya Alma

Sunucu ortamlarında tüm servisler (Backend, Frontend, Veritabanı, Nginx proxy) Docker container'ı içinde izole şekilde çalıştırılmaktadır. 

#### 📋 Gereksinimler
* **Docker:** v24+ & **Docker Compose:** v2+
* **Sistem:** En az 2 GB RAM, 10 GB boş disk alanı

#### 🚀 Production Deploy
```bash
# 1. Projeyi sunucuya klonlayın ve dizine geçin
git clone https://github.com/grideayazilim/gri-tms.git
cd gri-tms

# 2. Üretim ortam değişkenlerini kopyalayın ve şifreleri düzenleyin (nano/vim ile)
cp apps/management/server/.env.prod.example apps/management/server/.env.prod
nano apps/management/server/.env.prod

# 3. Docker ile tüm sistemi arka planda build edip başlatın
docker compose -f docker-compose.prod.yml up -d --build

# 4. İlk kurulumda admin kullanıcısı ve sistem ayarlarını yükleyin
docker compose -f docker-compose.prod.yml exec server node dist/database/seeder.js
```
* **Prod Ortamında Uygulama Arayüzü:** `http://<SUNUCU_IP>` (Varsayılan 80 portundan Nginx ile sunulur)

> 💡 **Prod Ortamı Yönetim Komutları:**
> * Komutlardaki `<DOSYA>` alanına `docker-compose.prod.yml` yazın.
> * Servis durumunu kontrol etme: `docker compose -f <DOSYA> ps`
> * Canlı log izleme: `docker compose -f <DOSYA> logs -f server`
> * Kod güncelleme ve yeniden deploy etme: `git pull && docker compose -f <DOSYA> up -d --build`

---

### 💾 3. Otomatik Yedekleme ve Geri Yükleme (Backup & Restore)

Verilerin güvenliği için günlük otomatik yedekleme mekanizması kuruludur. Yedek dosyaları sunucuda `/var/backups/timesheet` dizininde saklanır.

```bash
# 1. Script'lere çalıştırma izni verin ve yedek dizinini oluşturun
chmod +x docker/backup/backup.sh
chmod +x docker/backup/restore.sh
chmod +x docker/backup/list-backups.sh
mkdir -p /var/backups/timesheet

# 2. Otomatik yedeklemeyi kurun (Her gece 03:00'te yedek alması için)
# NOT: Bu adımı aktif etmek için önce terminalde "crontab -e" komutunu çalıştırın,
# ardından açılan düzenleyicinin en altına aşağıdaki satırı yapıştırıp kaydedin:
# 0 3 * * * /home/ubuntu/gri-tms/docker/backup/backup.sh >> /var/log/timesheet-backup.log 2>&1

# 3. Hemen manuel olarak yedek almak isterseniz:
./docker/backup/backup.sh

# 4. Mevcut yedekleri listelemek isterseniz:
./docker/backup/list-backups.sh

# 5. Yedeği geri yüklemek isterseniz:
./docker/backup/restore.sh timesheet_2026-05-23_03-00.sql.gz
```
---

## 🔌 Portlar Özet Tablosu

| Modül / Servis | Yerel (Dev) Ortamı | Production Ortamı |
|---|---|---|
| **Yönetim Paneli (Client)** | `localhost:5173` | `localhost:80` (Nginx Proxy) |
| **Yönetim API (Server)** | `localhost:3000` | Nginx Proxy → İç ağda `:3000` |
| **Bot Arayüzü (Client)** | `localhost:3005` | Nginx Proxy → İç ağda `:80` |
| **Bot Servisi (Server)** | `localhost:3001` | Nginx Proxy → İç ağda `:3001` |
| **Veritabanı (PostgreSQL)** | `localhost:5432` | Sadece Docker iç ağında `:5432` |
