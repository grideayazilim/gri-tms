# Puantaj Yönetim Sistemi Teknik Tasarım Raporu

## 0. Giriş
Bu rapor, geliştirilen Puantaj Yönetim Sistemi’nin frontend ve backend tarafında
nasıl implemente edildiğini açıklamak amacıyla hazırlanmıştır. Rapor kapsamında
kullanılan teknolojiler, sistem bileşenleri, iş kurallarının uygulanma biçimi ve
veri yönetimi süreçleri ele alınmıştır.

## 1. Frontend Tasarımı

### 1.1. Klasör Hiyerarşisi
```text
src/
├── api/
│   ├── httpClient.js       # JWT ekleyen merkezi HTTP client
│   ├── authService.js      # Auth API çağrıları
│   ├── timesheetService.js
│   ├── employeeService.js
│   ├── userService.js
│   ├── locationService.js
│   ├── settingsService.js
│   └── announcementService.js
│   └── logService.js
│
├── context/
│   └── AuthContext.tsx      # Global auth state
│
├── hooks/
│   ├── auth                 # Service'ten gelecek veriler ile state yönetimi yapılacak hook'lar 
│   ├── timesheet
│   ├── employee
│   ├── user
│   ├── location
│   ├── settings
│   ├── announcement
│   ├── logs
│   └── otherHooks.js        # Kullanılabilecek diğer hooklar
│
├── routes/
│   └── ProtectedRoute.tsx   # Rol bazlı route kontrolü
│
├── pages/
│
└── utils/
│   └── tokenStorage.ts      # Token saklama/okuma işlemleri
│   └── mappers.ts           # Backend'den gelen verileri UI'ın kullanıcı hale getirme
```

### 1.2. Global State Yönetimi
- Kullanıcı girişinde backend tarafından JWT üretilir ve frontend bu token'ı saklar.
- Yetki isteyen API işlemlerinde bu token kullanılır.
- Yukarıda bahsedilen işlemler için bilgiler **Auth Context** üzerinden yönetilir. Auth Context, API isteklerinde gerekecek kullanıcı verilerini global olarak tutar.

### 1.3. Sayfa Bazlı Detaylar

#### 1.3.1. Giriş/Kayıt Sayfası
**Amaç:** Kullanıcıların sisteme kimlik doğrulama ile giriş yapmasını sağlar.

**UI Bileşenleri:**
- Kullanıcı Adı / Şifre Girişi
- Giriş/Kayıt Butonu
- Kayıt olma ekranında yerleşke ve birim seçimi

**Erişim:** Herkes

**API Entegrasyonu:**
| Senaryo                              | Method | Endpoint         | Açıklama                                                                    |
| ------------------------------------ | ------ | ---------------- | --------------------------------------------------------------------------- |
| Giriş butonuna basılması             | POST   | `/auth/login`    | Kullanıcı kimlik bilgileri doğrulanır, başarılı girişte JWT üretilir        |
| Kayıt ol butonuna basılması          | POST   | `/auth/register` | Kullanıcı sisteme kayıt talebi oluşturur                                    |
| Sayfa yüklendikten sonra (opsiyonel) | GET    | `/auth/me`       | Mevcut oturum kontrol edilir, aktif oturum varsa kullanıcı bilgileri alınır |

#### 1.3.2. Puantaj Yönetim Sayfası
**Amaç:** Kullanıcıların sorumlu olduğu çalışanların puantajlarını düzenleyebilmesini sağlar.

**UI Bileşenleri:**
- Sorumlu olunan yerleşke/birim yazısı (admin yerleşke/birim seçimi yapabilir)
- Yıl-Ay seçme alanı
- Öğrenci arama alanı
- İlgili yerleşke/birimde çalışanların listesi
- Her bir çalışan satırında farklı işaretçiler ile (X, İ, R, ...) işaretlenebilir puantaj alanı
- Değişiklikleri kaydetme butonu

**Erişim:** Tüm kullanıcılar
- Birim sorumlusu YALNIZCA kendi sorumlu olduğu çalışanların verisine erişebilir
- Admin yerleşke/birim yazısı üzerinden seçim yaparak tüm verilere ulaşabilir.

**API Entegrasyonu:**
| Senaryo                         | Method | Endpoint                  | Açıklama                                               |
| ------------------------------- | ------ | ------------------------- | ------------------------------------------------------ |
| Sayfa ilk açıldığında           | GET    | `/timesheets`             | Varsayılan ay/yıl için puantaj verilerini getirir      |
| Yerleşke/Birim değişimi (Admin) | GET    | `/timesheets`              | Seçilen yerleşke/birime ait çalışan listesini yeniler  |
| Ay/Yıl değişimi                 | GET    | `/timesheets`             | Seçilen ay/yıla ait puantaj verilerini getirir         |
| Puantaj kaydetme                | POST   | `/timesheets` | Değişimi olan çalışanlara ait puantaj verilerini oluşturur veya günceller |

#### 1.3.3. Yerleşke/Birim Yönetim Sayfası
**Amaç:** Adminlerin kurumdaki yerleşke ve birimleri silmesini, düzenlemesini ve yenilerini eklemesini
sağlar.

**UI Bileşenleri:**
- Dashboard: _Seçili yerleşke/birim için özet bilgiler:_
- - Çalışma yeri adı
- - Yerleşke program numarası
- - Çalışan sayısı
- - Sorumlu sayısı
- - Çalışılan toplam gün sayısı
- - Ödenecek toplam tutar
- Yerleşke/birim yönetim alanı
- - Kurum adı (başlık)
- - Yerleşkeler ve program numaraları
- - Yerleşkeye ait Excel çıktısı alma butonları
- - Her yerleşkenin altında o yerleşkeye ait birimler 
- - Yerleşke/birim ekleme/silme butonları
- - Değişiklikleri kaydetme, vazgeçme butonu

**Erişim:** Yalnızca adminler

**API Entegrasyonu:**
| Senaryo                      | Method | Endpoint                 | Açıklama                                                         |
| ---------------------------- | ------ | ------------------------ | ---------------------------------------------------------------- |
| Sayfa ilk açıldığında        | GET    | `/locations/summary`     | Varsayılan yerleşke/birim için dashboard özet verilerini getirir |
| Yerleşke seçimi değiştiğinde | GET    | `/locations/summary`     | Seçilen yerleşkeye ait özet bilgileri yeniler                    |
| Yerleşke ekleme              | POST   | `/locations`             | Yeni yerleşke oluşturur                                          |
| Yerleşke güncelleme          | PUT    | `/locations/:locationId` | Yerleşke bilgilerini günceller                                   |
| Yerleşke silme               | DELETE | `/locations/:locationId` | Yerleşkeyi sistemden siler                                       |
| Birim ekleme                 | POST   | `/units`                 | Seçili yerleşke altında yeni birim oluşturur                     |
| Birim güncelleme             | PUT    | `/units/:unitId`         | Birim bilgilerini günceller                                      |
| Birim silme                  | DELETE | `/units/:unitId`         | Birimi sistemden siler                                           |
| Yerleşke bazlı Excel çıktısı | GET    | `/locations/report`      | Seçilen yerleşke için kapsamlı Excel raporu üretir               |

#### 1.3.4. Çalışan Yönetim Sayfası
**Amaç:** Adminlerin sisteme toplu veya tekli çalışan ekleyebilmesini, mevcut çalışan
verilerini görüntüleyip güncelleyebilmesini sağlar.

**UI Bileşenleri:** 
- Filtreleme alanı: yerleşke, birim seçimi
- Liste alanı
- - Çalışan listesi
- - Her satırda yer alan bilgileri güncelle butonu
- Çalışan ekleme alanı
- - Excel ile toplu çalışan ekleme
- - Input alanları ile tekli çalışan ekleme

**Erişim:** Yalnızca adminler

**API Entegrasyonu:**
| Senaryo                              | Method | Endpoint                 | Açıklama                                          |
| ------------------------------------ | ------ | ------------------------ | ------------------------------------------------- |
| Sayfa ilk açıldığında                | GET    | `/employees`             | Varsayılan filtrelerle çalışan listesini getirir  |
| Yerleşke/Birim filtresi değiştiğinde | GET    | `/employees`             | Filtreye göre çalışan listesini yeniler           |
| Tekli çalışan ekleme                 | POST   | `/employees`             | Input alanlarından girilen çalışanı sisteme ekler |
| Excel ile toplu çalışan ekleme       | POST   | `/employees/import`      | Excel dosyasını backend’e gönderir                |
| Çalışan bilgisi güncelleme           | PUT    | `/employee/:employeeId`  | Seçili çalışanın bilgilerini günceller            |
| Çalışan silme                        | DELETE | `/employees/:employeeId` | Çalışanı sistemden siler                          |

#### 1.3.5. Kullanıcı Yönetim Sayfası
**Amaç:** Adminlerin mevcut kullanıcıları görüntüleyebilmesini, birim ve yerleşke verilerini değiştirebilmesini sağlar.

**UI Bileşenleri:** 
- Onay bekleyen kayıtlar
- Filtreleme alanı
- - Admin, sorumlu seçimi
- - Yerleşke, birim seçimi
- Liste alanı
- - Kullanıcı listesi
- - Her kullanıcı satırında güncelleme butonu: açılan ekrandan güncelleme/silme yapma

**Erişim:** Yalnızca adminler

**API Entegrasyonu:**
| Senaryo                      | Method | Endpoint         | Açıklama                                                |
| ---------------------------- | ------ | ---------------- | ------------------------------------------------------- |
| Sayfa ilk açıldığında        | GET    | `/users`         | Tüm kullanıcıları getirir                               |
| Rol filtresi (admin/sorumlu) | GET    | `/users`         | Role göre kullanıcıları filtreler                       |
| Yerleşke/Birim filtresi      | GET    | `/users`         | Yerleşke/birim bazlı kullanıcı filtreleme               |
| Kullanıcı bilgisi güncelleme | PUT    | `/users/:userId` | Kullanıcının rol, birim, yerleşke bilgilerini günceller |
| Kullanıcı silme              | DELETE | `/users/:userId` | Kullanıcıyı sistemden siler                             |

#### 1.3.6. Ayarlar Sayfası
**Amaç:** Kullanıcıların kendine ait değiştirebileceği bilgileri değiştirebilmesini, ayrıca adminlerin
sistem parametrelerini yönetmesini sağlar.

**UI Bileşenleri:**
- Kullanıcı bilgi güncelleme alanı
- - Yalnızca kullanıcı adı ve şifre
- Çalışanların günlük ödenek miktarı
- Çalışanın haftada en fazla kaç gün çalışabileceği
- Puantaj işaretçi ayarı (Admin yeni madde ekleyebilir):
- - X: Geldi
- - İ: İzinli
- - R: Raporlu
- - DT: Devlet Tatili (Sömestır vb.)
- - RT: Resmi Tatil

**Erişim:** Tüm kullanıcılar (sorumlular kullanıcı bilgi güncelleme alanı haricinde hiçbir şey görmeyecek)

**API Entegrasyonu:**
| Senaryo                        | Method | Endpoint                    | Açıklama                                        |
| ------------------------------ | ------ | --------------------------- | ----------------------------------------------- |
| Sayfa ilk açıldığında (Admin)  | GET    | `/settings`                 | Sistem ayarlarını getirir                       |
| Günlük ödenek güncelleme       | PUT    | `/settings/daily-wage`      | Günlük çalışma ücretini günceller               |
| Haftalık max gün güncelleme    | PUT    | `/settings/max-weekly-days` | Haftalık maksimum çalışma gününü günceller      |
| Puantaj işaretçi güncelleme    | PUT    | `/settings/markers`         | İşaretçi ekleme/silme/güncelleme işlemleri      |
| Kullanıcı adı/şifre güncelleme | PUT    | `/users/me`                 | Oturum açmış kullanıcının bilgilerini günceller |

#### 1.3.7. Duyuru Sayfası
**Amaç:** Adminlerin sistemdeki tüm kullanıcılara duyuru yapabilmesini sağlamak.

**UI Bileşenleri:**
- Duyuru listesi
- Duyuru oluşturma butonu
- Duyuru oluşturma ekranı

**Erişim:** Tüm kullanıcılar (sorumlular yalnızca duyuru listesini görür.)

**API Entegrasyonu:**
| Senaryo               | Method | Endpoint         | Açıklama                          |
| --------------------- | ------ | ---------------- | --------------------------------- |
| Sayfa ilk açıldığında | GET    | `/announcements` | Sistemdeki tüm duyuruları getirir |
| Duyuru oluşturma      | POST   | `/announcements` | Yeni duyuru oluşturur (admin)     |

#### 1.3.8. Log Sayfası
**Amaç:** Sistemdeki her türlü işlemin kaydının görüntülenmesini sağlamak.

**Erişim:** Adminler

**API Entegrasyonu:**
| Senaryo               | Method | Endpoint     | Açıklama                                                |
| --------------------- | ------ | ------------ | ------------------------------------------------------- |
| Sayfa ilk açıldığında | GET    | `/logs`      | Varsayılan log listesini getirir                        |
| Log türü filtresi     | GET    | `/logs`      | Seçilen filtrelere göre logları getirir                 |
| Log metadata çekme    | GET    | `/logs/meta` | Frontend filtreleme alanları için log tiplerini getirir |

## 2. Backend
> Not: Bu bölümde API’lerin sorumlulukları ve yetkilendirme yapıları açıklanmıştır.
Detaylı request ve response formatları, raporun Ekler bölümünde yer alan
API Sözleşmesi dokümanında sunulmuştur.

### 2.1. Klasör Hiyerarşisi
```text
src/
├── app.js                     # Express app init
├── server.js                  # Server bootstrap
│
├── routes/
│   ├── authRoutes.js
│   ├── timesheetRoutes.js
│   ├── locationRoutes.js
│   ├── unitRoutes.js
│   ├── employeeRoutes.js
│   ├── userRoutes.js
│   ├── announcementRoutes.js
│   ├── settingsRoutes.js
│   └── logRoutes.js
│
├── controllers/
│   ├── authController.js
│   ├── timesheetController.js
│   ├── locationController.js
│   ├── unitController.js
│   ├── employeeController.js
│   ├── userController.js
│   ├── announcementController.js
│   ├── settingsController.js
│   └── logController.js
│
├── middlewares/
│   ├── authMiddleware.js          # JWT doğrulama
│   ├── roleMiddleware.js          # Rol kontrolü
│   ├── unitScopeMiddleware.js     # Birim kapsamı
│   └── dateRuleMiddleware.js      # Tarihsel kural kontrolü
│
├── utils/
│   ├── jwt.js
│   ├── password.js
│   ├── excel.js
│   └── logger.js
│
└── config/
    ├── env.js
    └── database.js     # Pool ve transaction fonksiyonları
```

### 2.2. Katmanlı Mimari Akışı
```text
HTTP Request
   ↓
Route
   ↓
Middleware (auth → role → scope → date)
   ↓
Controller
   ↓
Database
```

### 2.2. Middleware Katmanı
- **authMiddleware:** JWT doğrulaması yapar.
- **roleMiddleware:** Admin/sorumlu rol kontrolü sağlar.
- **unitScopeMiddleware:**  Birim sorumlularının yalnızca kendine ait verileri görmesini sağlar.
- - Adminler bu ara katmanı bypass eder.
- **dateRuleMiddleware:** Süresi geçmiş komutların ve kullanıcıların işlemlerin kontrolünü sağlar.

### 2.3. API Katmanı

#### 2.3.1. Authentication API'leri
- **POST /auth/login:** Sisteme giriş yapar. Başarılı girişte JWT üretir.
- - **_Yetki:_** Tüm kullanıcılar
- **POST /auth/register:** Sisteme kayıt olmak için admin'e istek gönderir.
- - **_Yetki:_** Herkes
- **GET /auth/me:** Giriş yapan kullanıcının bilgilerini döndürür.
- - **_Yetki:_** Giriş yapmış herkes

#### 2.3.2. Puantaj API'leri
- **GET /timesheets:** Query ile alınan ilgili birim ve aya ait puantaj verilerini öğrenci bilgileri ile birlikte getirir.
- **POST /timesheets:** Query ile alınan ilgili aya ait puantaj yoksa oluşturur, varsa günceller. Tekli veri güncelleme API'si değildir. UI'dan değiştirilen birden fazla öğrenci puantajını toplu günceller.
- - **_Yetki:_** Sorumlular kapsam dahilindeki verileri, adminler tüm verileri.
- **GET /timesheets/export:** Query olarak alınan yerleşke id'li birimin yine query olarak alınan
aydaki puantaj formunu Excel formatında oluşturur.

#### 2.3.3. Yerleşke/Birim API'leri
**_Yetki:_** Yalnızca admin
- **POST /locations:** Yerleşke oluşturur.
- **PUT /locations/:locationId:** Yerleşke bilgisini günceller.
- **DELETE /locations/:locationId:** Yerleşkeyi siler.
- **GET /locations/summary:** Query olarak alınan yerleşke + birim id'si ile ilgili yere ait şu verileri çeker:
- - Çalışma yeri adı
- - Yerleşke program numarası
- - Çalışan sayısı
- - Sorumlu sayısı
- - Çalışma ayı
- - Çalışılan toplam gün sayısı
- - Bu çalışma ayında ödenecek toplam tutar
- - **GET /locations/report:** Query olarak alınan yerleşke id'si ile kurumun istediği formatta kapsamlı Excel çıktısı alır.
- **POST /units:** Bir yerleşke içinde birim oluşturur.
- **PUT /units/:unitId:** Birim bilgisini günceller.
- **DELETE /units/:unitId:** Birimi siler.

#### 2.3.4. Kullanıcı API'leri
**_Yetki:_** Yalnızca admin
- **DELETE /users/:userId:** Sistemde kayıtlı olan kullanıcıyı siler.
- **PUT /users/:userId:** Sistemdeki kullanıcının birim/yerleşke bilgisini günceller. 
- **GET /users:** Sistemdeki kullanıcıları çeker. Query'ler ile filtreleme.
- **PUT /users/me:** Kullanıcı oturum açık olan kişinin kullanıcı adı ve şifresini günceller.
- - _Tüm kullanıcılar bu yetkiye sahiptir._

#### 2.3.5. Çalışan API'leri
**_Yetki:_** Yalnızca admin
- **POST /employees:** Tekli çalışan ekler.
- **POST /employees/import:** Excel inputu ile çoklu çalışan ekler. 
- - Hatalı satırlar raporlanır.
- - Geçerli kayıtlar sisteme eklenir.
- **DELETE /employees/:employeeId:** Çalışan siler.
- **PUT /employee/:employeeId:** Çalışan bilgilerini günceller.
- **GET /employees:** Sistemdeki çalışanları çeker. Query'ler ile filtreleme.

#### 2.3.6. Duyuru API'leri
- **POST /announcements:** Duyuru oluşturur.
- **_Yetki:_** Yalnızca admin
- **GET /announcements:** Duyuruları getirir.
- **_Yetki:_** Giriş yapmış kullanıcılar

#### 2.3.7. Log API'leri
**_Yetki:_** Yalnızca admin
- **GET /logs:** Log listesini getirir. Query ile filtre.
- **GET /logs/meta:** Frontend'de kullanılacak log türlerini getirir.

#### 2.3.8. Ayarlar API'leri
**_Yetki:_** Yalnızca admin
- **GET /settings:** Sistem ayarlarını getir.
- **PUT /settings/daily-wage:** Günlük ödenek tutarını günceller.
- **PUT /settings/max-weekly-days:** Haftalık maksimum çalışma gününü günceller.
- **PUT /settings/program-date:** Programın dönemini ayarlar (başlangıç tarihi, bitiş tarihi olarak).
- **PUT /settings/markers:** Puantaj işaretçisi ekler/siler/günceller.

## 3. Veri Modeli

### 3.1. Entity'ler
- locations: Yerleşkeler
- units: Birimler
- users: Kullanıcılar (admin/sorumlu)
- employees: Çalışanlar
- periods: Aylar (2026-01 vb.)
- markers: Puantaj işaretleme kodları (X, İ, ...)
- timesheets: Bir çalışanın bir aya ait puantaj bilgileri
- timesheet_days: Her puantaj dosyasının gün gün değeri
- settings: Sistem ayarları
- announcements: Duyurular
- logs: Log kayıtları

### 3.2. İlişkiler (Relationships)
```text
Location
  └─< Unit
        ├─< Employee
        │     └─< Timesheet (employee_id + period_id UNIQUE | çalışanın bir aya ait tek bir puantajı olabilir)
        │           └─< TimesheetDay (timesheet_id + date UNIQUE | çalışanın bir gün için tek bir kaydı olabilir)
        │                 └─ Marker
        │
        └─< User (role = RESPONSIBLE, unit_id ZORUNLU | )

User (role = ADMIN)
  └─ unit_id YOK / NULL

Period
  └─< Timesheet
```

### 3.3. Tablo Bazlı Detaylar

| entity    | fields (alanlar)                                                                        | kurallar                                      |
| --------- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| locations | `id (uuid PK)`<br>`name`<br>`program_no`<br>`created_at`<br>`updated_at` | `program_no` **UNIQUE** (kurum genelinde tek) |
| units  | `id (uuid PK)`<br>`location_id (FK → locations.id)`<br>`name`<br>`created_at`<br>`updated_at` | Aynı yerleşkede aynı birim adı olamaz:<br>**UNIQUE(location_id, name)** |
| employees | `id (uuid PK)`<br>`unit_id (FK → units.id)`<br>`tc_no`<br>`iban_no`<br>`first_name`<br>`last_name`<br>`start_date`<br>`end_date`<br>`created_at`<br>`updated_at` | `tc_no` kullanılıyorsa **UNIQUE(tc_no)**<br>`end_date >= start_date` |
| users  | `id (uuid PK)`<br>`username (unique)`<br>`password_hash`<br>`role (ADMIN / RESPONSIBLE)`<br>`status (PENDING / ACTIVE)`<br> `location_id (FK → locations.id, NULL olabilir)` <br>`unit_id (FK → units.id, NULL olabilir)`<br>`expiry_date`<br>`last_login_at`<br>`created_at`<br>`updated_at` | Birim sorumlusu için `unit_id` zorunlu:<br>`CHECK (role <> 'RESPONSIBLE' OR unit_id IS NOT NULL OR location_id IS NOT NULL)` |
| periods | `id (uuid PK)`<br>`year`<br>`month`<br>`start_date`<br>`end_date` | **UNIQUE(year, month)**<br>`month BETWEEN 1 AND 12`<br>`end_date >= start_date` |
| markers | `id (uuid PK)`<br>`code`<br>`label`<br>`is_paid`<br> | `code` **UNIQUE** |
| timesheets | `id (uuid PK)`<br>`employee_id (FK → employees.id)`<br>`period_id (FK → periods.id)`<br>`unit_id (FK → units.id)`<br>`is_locked`<br>`created_at`<br>`updated_at` | Aynı çalışan + aynı ay tek kayıt:<br>**UNIQUE(employee_id, period_id)**<br>`unit_id`, employee’nin `unit_id`’si ile aynı olmalı (trigger). `is_locked` ise sorumlunun veri kaydı engellenmeli |
| timesheet_days | `id (uuid PK)`<br>`timesheet_id (FK → timesheets.id)`<br>`day (date)`<br>`marker_code (FK → markers.code)`<br>`note` | Aynı gün iki kez girilemez:<br>**UNIQUE(timesheet_id, day)**<br>`day`, ilgili period aralığında olmalı (trigger)<br>Timesheet `LOCKED` ise insert/update yasak (trigger) |
| settings | `key (PK)`<br>`value (jsonb)`<br>`program_start_date`<br>`<program_end_date`<br>`updated_at` | `key` sistem genelinde tek |
| announcements | `id (uuid PK)`<br>`title`<br>`content`<br>`created_at` | —        |
| logs   | `id`<br>`actor_user_id (FK → users.id)`<br>`action`<br>`entity_type`<br>`entity_id`<br>`metadata (jsonb)`<br>`created_at` | Log kayıtları **silinemez** (DB yetkisiyle engellenir) |

## 4. Veritabanı Tasarımı
Sistem verilerinin tutulduğu şema: `app`.

### 4.1. Veritabanı Kullanıcıları ve Yetki Modeli

#### 4.1.1. Roller
Roller ile yetki paketleri tanımlanır. Sistemde iki rol tanımlanır:
- `app_role`
- - NOLOGIN (yalnızca yetki için)
- - Uygulamanın kullanacağı yetkiler: SELECT / INSERT / UPDATE / DELETE.
- -  RLS policy'leri.
- `migration_role`
- - NOLOGIN (yalnızca yetki için)
- - Database yönetimi için yetkiler: CREATE / ALTER / DROP
- - index/policy/trigger oluşturma işlemleri

#### 4.1.2. Kullanıcılar
- `app_user`
- - LOGIN
- - Backend bu user olarak bağlanır.
- - app_role bu kullanıcıya atanır.
- `migration_user`
- - Database şemasını kurmak/güncellemek için kullanılır.
- - Bu user ayrımı ile backend ele geçirilse bile database çökertilemez. **ÖNEMLİ!**

### 4.2. İlişkili Tabloları Silme Davranışı
İlişkili tablolardaki bir satırı silmek için iki yol: 
- **RESTRICT:** Parent kayda bağlı child kayıtlar varsa silme işlemini engeller.
- **CASCADE:** Parent kayıt silindiğinde, ona bağlı child kayıtları da otomatik olarak siler.

Sistemdeki örnekler:

| Senaryo | FK Davranışı | Kısa Açıklama |
|-------|-------------|---------------|
| units.location_id → locations.id | RESTRICT | Yerleşkeye bağlı birim varsa yerleşke silinemez |
| employees.unit_id → units.id | RESTRICT | Birime bağlı çalışan varsa birim silinemez |
| timesheets.employee_id → employees.id | CASCADE | Çalışana ait puantaj varsa çalışan yine de silinir |
| timesheet_days.timesheet_id → timesheets.id | CASCADE | Puantaj silinirse gün kayıtları otomatik silinir |

### 4.3. Indexing
Hıza ihtiyacı olan index setleri

- `employees(unit_id)`
- `timesheets(unit_id, period_id)`
- `timesheet_days(timesheet_id, day)`
- `users(unit_id)`
- `units(location_id)`
- `logs(created_at)`

### 4.4. RLS Yönetimi
**Amaç:** Backend'de middleware ile sağlanan güvenlik, DB'de RLS ile sağlanır. Kullanıcıların sorumlu olduğu kapsam kadar veriye erişmesini sağlar.

**Uygulanacak Satırlar**
- employees
- timesheets
- timesheet_days

**Çalışma Prensibi**
- Backend her request'te DB oturumuna kullanıcı bilgilerini session variable olarak set eder.
- Kullanıcı, verilere şu kapsamda verilere erişir:
- - Kullanıcı admin ise tüm satırlar erişilebilir.
- - Kullanıcı birim sorumlusu ise kendi unit_id ve location_id'sine bağlı verileri görebilir.

## 5. Güvenlik & Erişim Kontrolü
> KRİTİK! Raporda da anlatıldığı gibi yetkilendirme yalnızca frontend tarafında değil, backend ve database tarafında da eksiksiz yapılmak **ZORUNDA!**. Bu kısımda raporda halihazırda anlatılan güvenlik önemlerinin özetini içermektedir.

### 5.1. JWT Yetkilendirme
- Frontend & backend'de yetkilendirme işlemleri için kullanılacak JWT token'ında şunlar olmalıdır:
- - Kullanıcı ID'si
- - Kullanıcı Rolü
- - Kullanıcı Yerleşke ID'si
- - Kullanıcı Birim ID'si

### 5.2. UI Yönetimi
Backend'den gelen JWT token ile kullanıcının görmemesi gereken bileşenler gösterilmez. Yetkilendirme gereken route'lar Protected Route ile korunur.

### 5.3. API Yetkilendirme
API isteklerinin zincirinde backend tasarımında tanımlanan middleware fonksiyonları, gerektiği yerde eksiksiz kullanılmalıdır. Bu yöntem ile backend 

### 5.4. PostgreSQL Row Level Security
API yetkilendirmesi uygulama katmanında güvenliği sağlar. Ancak yetkisiz işlem database'e geldiğinde asıl güvenliği
RLS sağlar.

### 5.5. SQL Injection Güvenliği
Route yoluna yazılacak query ile database'den yetkisiz veri çekme işlemine SQL Injection denir. Bu işlemden korunmak için query'den gelecek verileri direkt string olarak değil, sorgu içinde parametre olarak işlememiz gerekiyor. 

## 6. Teknoloji Stack'i

**Frontend:** React Vite

**Backend:** Node.js + Express.js

**Database:** PostgreSQL
