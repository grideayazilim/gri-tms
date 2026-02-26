# API Sözleşmesi
Bu bölümde projede kullanılacak API'lere gönderilecek istekler ve API'lerin 
vereceği cevaplar ayrıntılı bir şekilde açıklanmıştır.

## 1. Authentication (Hazır)

## 2. Puantaj API'leri

### 2.1. GET /timesheets
**Açıklama:** Puantaj verisi getir.

🔒 **Yetki:** Tüm kullanıcılar (scope kontrolü ile)

**Middleware:** authMiddleware -> scopeMiddleware

**Filtreleme İçin Query Parameters:**
```text
unitId      (string, optional)  - Birim ID (RESPONSIBLE için kendi birimi olmalı)
locationId  (string, optional)  - Yerleşke ID
month       (string, optional)  - Ay (format: YYYY-MM, örn: 2024-01)
year        (integer, optional) - Yıl (örn: 2024)
status      (string, optional)  - Durum (locked, unlocked)
search      (string, optional)  - Çalışan isim/TC araması
page        (integer, optional) - Sayfa numarası (default: 1)
limit       (integer, optional) - Sayfa başına kayıt (default: 50)
```

**Request Örneği:**
```text
GET /timesheets?unitId=uuid&locationId=uuid&month=2024-01&page=1&limit=50
```

**Örnek Response(200 OK):**
```text
{
  "success": true,
  "data": {
    "timesheets": [
      {
        "id": "uuid",
        // çalışan verisi
        "employee": {
          "id": "uuid",
          "firstName": "Ali",
          "lastName": "Yılmaz",
          "tcNo": "12345678901",
          "ibanNo": "TR123..."
        },
        // puantaj periyodu
        "period": {
          "id": "uuid",
          "year": 2024,
          "month": 1,
          "startDate": "2024-01-01",
          "endDate": "2024-01-31",
          "isLocked": false
        },
        "unit": {
          "id": "uuid",
          "name": "Bilgisayar Mühendisliği",
          "location": {
            "id": "uuid",
            "name": "Merkez Kampüs",
            "programNo": "12345"
          }
        },
        "days": [
          {
            "id": "uuid",
            "day": "2024-01-01",
          },
          // ... diğer günler
        ],
        "totalWorkDays": 20,
        "totalPaidAmount": 6000.00,
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-15T14:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 250,
      "limit": 50
    }
  }
}
```

**Scope Davranışı:**
- Admin: unitId/locationId verilmezse tüm veriler döner
- Responsible: Otomatik kendi unit ve location id'si uygulanır, başka birim istenirse 403.

### 2.2. POST /timesheets
**Açıklama:** Puantaj oluştur/güncelle. (Toplu)

🔒 **Yetki:** Tüm kullanıcılar (scope kontrolü ile)

**Middleware:** authMiddleware -> scopeMiddleware

**Request Body:**
```text
{
  "periodId": "uuid",
  "timesheets": [
    {
      "employeeId": "uuid",
      "days": [
        {
            "id": "uuid",
            "day": "2024-01-01",
        },
        // ... diğer günler
      ]
    },
    // ... diğer çalışanlar
  ]
}
```

**Validasyon:**
- periodId geçerli olmalı.
- periodId'da is_locked=true ise puantaj'a veri girişi yapılamamalı. 
- Puantaj verisindeki unit/location kullanıcının erişim yetkisinde olmalı.
- is_paid=true olarak işaretli gün sayısı bir hafta içerisinde settings'teki max-weekly-days'den fazla olmamalı.

### 2.3. PATCH /timesheets/:periodId/lock
**Açıklama:** Bir aya ait tüm puantajlara veri giriş/çıkışını engelle. (Direkt period'u kitle)

🔒 **Yetki:** Admin

**Middleware:** authMiddleware -> adminMiddleware

## 3. Yerleşke ve Birim API'leri

### 3.1. GET /locations
**Açıklama:** Yerleşkeleri getirir.

🔒 **Yetki:** Tüm kullanıcılar

**Middleware:** authMiddleware

**Örnek Response (200 OK):**
```text
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": "uuid",
        "name": "Merkez Kampüs",
        "programNo": "12345",
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

### 3.2. GET /units
**Açıklama:** Birimleri getirir.

🔒 **Yetki:** Tüm kullanıcılar

**Middleware:** authMiddleware

**Örnek Response (200 OK):**
```text
{
  "success": true,
  "data": {
    "units": [
      {
        "id": "uuid",
        "locationId": "uuid",
        "name": "Bilgisayar Mühendisliği",
        "employee_count": 45,
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

### 3.3. GET /locations/:locationId/units
**Açıklama:** Bir yerleşkeye ait birimleri getir.

🔒 **Yetki:** Tüm kullanıcılar

**Middleware:** authMiddleware

**Örnek Response (200 OK):**
```text
{
  "success": true,
  "data": {
    "units": [
      {
        "id": "uuid",
        "locationId": "uuid",
        "name": "Bilgisayar Mühendisliği",
        "employeeCount": 45,
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

### 3.4. POST /locations
**Açıklama:** Yerleşke ekler.

🔒 **Yetki:** Yalnızca admin

**Middleware:** authMiddleware -> adminMiddleware

**Request Body:**
```text
{
  "name": "Yeni Kampüs",
  "programNo": "54321"
}
```

**Validasyon:**
...


### 3.4. POST /units
3.3 ile aynı mantık. Birim oluşturma.

**Request Body:**
```text
{
  "locationId": "uuid",
  "name": "Yazılım Mühendisliği"
}
```

**Validasyon:**
...

### 3.5. PUT /locations/:locationId
**Açıklama:** Yerleşke verisi günceller.

🔒 **Yetki:** Yalnızca admin

**Middleware:** authMiddleware -> adminMiddleware

**Request Body:**
```text
{
  "name": "Güncellenmiş Kampüs Adı",
  "programNo": "54322"
}
```

### 3.6. PUT /units/:unitId
3.5 ile aynı mantık. Birim verisi güncelleme.

**Request Body:**
```text
{
  "locationId": yeni yerleşke id'si
  "name": "Güncellenmiş Birim Adı",
}
```

### 3.7. DELETE /locations/:locationId
**Açıklama:** Yerleşke verisi siler.

🔒 **Yetki:** Yalnızca admin

**Middleware:** authMiddleware -> adminMiddleware

### 3.8. DELETE /units/:unitId
3.7 ile aynı. Unit silme.

**DİKKAT:** Silinecek location ve unit'e kayıtlı employee varsa DB silme işlemin izin vermiyor. İki seçenek var.
- CASCADE: Bağlı tüm verilerle beraber sil.
- RESTRICT: Bağlı veriler varken ilgili kaydı silmeyi engelle.

## 4. Çalışan (Öğrenci) API'leri
🔒 **Yetki:** Yalnızca admin

**Middleware:** authMiddleware -> adminMiddleware

### 4.1. GET /employees
**Açıklama:** Çalışan verilerini getir.

**Query Parameters:**
```text
unitId      (string, optional) - Birim ID
locationId  (string, optional) - Yerleşke ID
search      (string, optional) - İsim/TC/IBAN araması
status      (string, optional) - active, inactive
page        (integer, optional) - Sayfa numarası (default: 1)
limit       (integer, optional) - Sayfa başına kayıt (default: 50)
```

**Örnek Response (200 OK):**
```text
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "uuid",
        "unit": {
          "id": "uuid",
          "name": "Bilgisayar Mühendisliği",
          "location": {
            "id": "uuid",
            "name": "Merkez Kampüs"
          }
        },
        "tcNo": "12345678901",
        "ibanNo": "TR123456789012345678901234",
        "firstName": "Ali",
        "lastName": "Yılmaz",
        "startDate": "2024-01-01",
        "endDate": null,
        "isActive": true,
        "createdAt": "2024-01-01T10:00:00Z",
        "updatedAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRecords": 145,
      "limit": 50
    }
  }
}
```

### 4.2. POST /employees
**Açıklama:** Çalışan verisi günceller.

**Validasyon:**
- TC No 11 haneli sayı, unique
- IBAN No TR + 24 haneli sayı
- firstName, lastName 60 karakter
- startDate, programStartDate'den sonra
- endDate, startDate'ten sonra ve programEndDate'ten önce

### 4.3. POST /employees/import
**Açıklama:** Excel importu ile toplu çalışan verisi ekleme. Yapana Allah zihin açıklığı versin.
- Response'ta aşağıdaki tüm bilgiler olmalı:
- - Toplam okunan satır
- - Başarıyla eklenen satır sayısı
- - Eklenemeyen satır sayısı (hatalı)
- - Başarıyla eklenen satırların bilgisi (teker teker, array ile)
- - Eklenemeyen satırların bilgisi (teker teker, array ile)

### 4.4. PUT /employees/:employeeId
**Açıklama:** Çalışan verisi günceller.

**Request Body:**
```text
{
  "tcNo": 11111111111111,
  "locationId": "Yeni location id",
  "unitId": "Yeni unit id",
  "firstName": "Güncellenmiş İsim",
  "lastName": "Güncellenmiş Soyisim",
  "ibanNo": "TR111111111111111111111111",
  "startDate": 2024-12-30",
  "endDate": "2024-12-31" 
}
```

### 4.5. DELETE /employees/:employeeId
**Açıklama:** Çalışan verisi siler.


## 5. Kullanıcı API'leri
**Açıklama:** Kullanıcıları getirir.

🔒 **Yetki:** Yalnızca admin

**Middleware:** authMiddleware -> adminMiddleware

### 5.1. GET /users
**Query Parameters:**
```text
role        (string, optional) - ADMIN, RESPONSIBLE
status      (string, optional) - PENDING, ACTIVE
unitId      (string, optional) - Birim ID
locationId  (string, optional) - Yerleşke ID
search      (string, optional) - Username araması
page        (integer, optional)
limit       (integer, optional)
```

**Örnek Response (200 OK):**
```text
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "john_doe",
        "role": "RESPONSIBLE",
        "status": "ACTIVE",
        "unit": {
          "id": "uuid",
          "name": "Bilgisayar Mühendisliği",
          "location": {
            "id": "uuid",
            "name": "Merkez Kampüs"
          }
        },
        "expiryDate": null,
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 5.2. PUT /users/:userId
**Açıklama:** Kullanıcı verisi günceller.

**Request Body:**
```text
{
  "role": "ADMIN",
  "status": "ACTIVE",
  "unitId": "uuid",       // role=RESPONSIBLE ise gerekli
  "locationId": "uuid",   // role=RESPONSIBLE ise gerekli
  "expiryDate": "2024-12-31"  // null = süresiz
}
```

### 5.3. DELETE /users/:userId
**Açıklama:** Kullanıcı verisi siler.

### 5.4. PUT /users/me
**Açıklama:** Mevcut kullanıcının profil bilgilerini güncelleme.

🔒 **Yetki:** Tüm kullanıcılar

**Middleware:** authMiddleware

**Request Body:**
```text
{
  "username": "new_username",  // Opsiyonel
  "oldPassword": "OldPass123!",  // Şifre değişimi için gerekli
  "newPassword": "NewPass123!"   // Şifre değişimi için gerekli
}
```

**Validasyon:**
- Şifre değişimi için oldPassword doğru olmalı.
- newPassword, şifre validasyonunu karşılamalı

## 6. Duyuru API'leri

### 6.1. GET /announcements
**Açıklama:** Duyuruları getirir.

🔒 **Yetki:** Tüm kullanıcılar

**Middleware:** authMiddleware

**Query Parameters:**
```text
page  (integer, optional) - Sayfa numarası
limit (integer, optional) - Sayfa başına kayıt (default: 20)
```

**Örnek Response (200 OK):**
```text
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "uuid",
        "title": "Sistem Bakımı Duyurusu",
        "content": "15 Şubat Perşembe günü saat 14:00-16:00 arası sistem bakıma alınacaktır.",
        "authorId": "uuid",
        "authorName": "Author",
        "createdAt": "2024-02-10T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 6.2. POST /announcements
**Açıklama:** Duyuru paylaşır.

🔒 **Yetki:** Yalnızca adminler

**Middleware:** authMiddleware -> adminMiddleware

**Request Body:**
```text
{
  "title": "Yeni Duyuru",
  "content": "Duyuru içeriği buraya yazılır.",
  "authorId": "uuid",
  "authorName": "Author",
}
```

**Validasyon:**
- title 1-200 karakter olmalı
- content 1-3000 karakter olmalı

## 7. Ayarlar ve Marker API'leri
🔒 **Yetki:** Yalnızca adminler

**Middleware:** authMiddleware -> adminMiddleware

### 7.1. GET /settings
**Açıklama:** Sistem ayarlarını getirir.

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "id": 1,
      "dailyWage": 500.00,
      "maxWeeklyDays": 6,
      "programStartDate": "2024-01-01",
      "programEndDate": "2026-12-31",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2026-02-26T10:00:00Z"
    }
  }
}
```

### 7.2. PUT /settings/daily-wage
**Açıklama:** Günlük ücret bilgisini güncelle.

**Request Body:**
```json
{
  "dailyWage": 600.00
}
```

**Validasyon:**
- `dailyWage` 0'dan büyük olmalı.

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "id": 1,
      "dailyWage": 600.00,
      "maxWeeklyDays": 6,
      "programStartDate": "2024-01-01",
      "programEndDate": "2026-12-31",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2026-02-26T10:30:00Z"
    }
  },
  "message": "Günlük ücret güncellendi"
}
```

### 7.3. PUT /settings/max-weekly-days
**Açıklama:** Haftalık maksimum çalışma gün sınırını değiştir.

**Request Body:**
```json
{
  "maxWeeklyDays": 5
}
```

**Validasyon:**
- `maxWeeklyDays` 0'dan büyük olmalı.

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "id": 1,
      "dailyWage": 600.00,
      "maxWeeklyDays": 5,
      "programStartDate": "2024-01-01",
      "programEndDate": "2026-12-31",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2026-02-26T10:45:00Z"
    }
  },
  "message": "Haftalık maksimum gün güncellendi"
}
```

### 7.4. PUT /settings/program-date
**Açıklama:** Program başlangıç ve bitiş tarihini günceller.

**Request Body:**
```json
{
  "programStartDate": "2024-01-01",
  "programEndDate": "2027-12-31"
}
```

**Validasyon:**
- `programEndDate` > `programStartDate` olmalı.

**Yan Etkiler:**
- Bu güncelleme yapıldığında `periods` tablosu tamamen temizlenip yeniden oluşturulur.
- Yeni başlangıç ve bitiş tarihi arasındaki tüm aylar için period kayıtları oluşturulur.

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "id": 1,
      "dailyWage": 600.00,
      "maxWeeklyDays": 5,
      "programStartDate": "2024-01-01",
      "programEndDate": "2027-12-31",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2026-02-26T11:00:00Z"
    }
  },
  "message": "Program tarihleri ve dönemler güncellendi"
}
```

### 7.5. GET /markers
**Açıklama:** Tüm puantaj işaretçilerini listele.

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "markers": [
      {
        "id": "uuid-1",
        "code": "X",
        "label": "Çalıştı",
        "isPaid": true
      },
      {
        "id": "uuid-2",
        "code": ".",
        "label": "Çalışmadı",
        "isPaid": false
      },
      {
        "id": "uuid-3",
        "code": "İ",
        "label": "İzin",
        "isPaid": true
      },
      {
        "id": "uuid-4",
        "code": "R",
        "label": "Rapor",
        "isPaid": true
      }
    ]
  }
}
```

### 7.6. POST /markers
**Açıklama:** Yeni puantaj işaretçisi ekle.

**Request Body:**
```json
{
  "code": "M",
  "label": "Mazeret",
  "isPaid": false
}
```

**Validasyon:**
- `code` unique olmalı.
- `code`, `label` ve `isPaid` (boolean) zorunlu.

**Örnek Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "marker": {
      "id": "uuid-5",
      "code": "M",
      "label": "Mazeret",
      "isPaid": false
    }
  },
  "message": "Marker oluşturuldu"
}
```

### 7.7. PUT /markers/:code
**Açıklama:** Mevcut işaretçiyi güncelle.

**Request Body:**
```json
{
  "label": "Mazeretli",
  "isPaid": true
}
```

**Not:** `code` değiştirilemez (PK olarak kullanılıyor).

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "marker": {
      "id": "uuid-5",
      "code": "M",
      "label": "Mazeretli",
      "isPaid": true
    }
  },
  "message": "Marker güncellendi"
}
```

### 7.8. DELETE /markers/:code
**Açıklama:** İşaretçiyi sil.

**Validasyon:**
- Eğer bu marker `timesheet_days` tablosunda kullanılıyorsa silinemez (FK constraint).

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "message": "Marker silindi"
}
```

**Hata Durumu (409 Conflict):**
```json
{
  "success": false,
  "message": "Bu marker kullanımda, silinemez"
}
```

## 8. Audit Log API'leri
🔒 **Yetki:** Yalnızca adminler

**Middleware:** authMiddleware -> adminMiddleware

### 8.1. GET /audit-logs
**Açıklama:** Sistem aktivite kayıtlarını getirir.

**Query Parameters:**
```text
username    (string, optional) - İşlemi yapan kullanıcı adı
eventType   (string, optional) - LOGIN, LOGOUT, USER, EMPLOYEE, TIMESHEET, SETTINGS, vb.
tableName   (string, optional) - employees, users, timesheets, vb.
startDate   (string, optional) - Başlangıç tarihi (YYYY-MM-DD)
endDate     (string, optional) - Bitiş tarihi (YYYY-MM-DD)
page        (integer, optional) - Sayfa numarası (default: 1)
limit       (integer, optional) - Sayfa başına kayıt (default: 50)
```

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": "uuid-1",
        "username": "sorumlu_ahmet",
        "userRole": "RESPONSIBLE",
        "description": "Mehmet Yılmaz adlı çalışanın Şubat 2026 puantajını güncelledi (5 gün değiştirildi)",
        "eventType": "TIMESHEET",
        "tableName": "timesheets",
        "recordId": "uuid-timesheet-1",
        "oldData": {
          "modifiedDays": [
            {"date": "2026-02-01", "oldMarker": "X", "newMarker": "."}
          ]
        },
        "newData": {
          "totalDaysChanged": 5,
          "paidDaysChanged": 2
        },
        "createdAt": "2026-02-26T14:30:00Z"
      },
      {
        "id": "uuid-2",
        "username": "sorumlu_ahmet",
        "userRole": "RESPONSIBLE",
        "description": "Sisteme giriş yaptı",
        "eventType": "LOGIN",
        "tableName": null,
        "recordId": null,
        "oldData": null,
        "newData": null,
        "createdAt": "2026-02-26T09:00:00Z"
      },
      {
        "id": "uuid-3",
        "username": "admin_user",
        "userRole": "ADMIN",
        "description": "Günlük ücreti 500.00 TL'den 600.00 TL'ye yükseltti",
        "eventType": "SETTINGS",
        "tableName": "settings",
        "recordId": "1",
        "oldData": {"dailyWage": 500.00},
        "newData": {"dailyWage": 600.00},
        "createdAt": "2026-02-26T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

### 8.2. GET /audit-logs/meta
**Açıklama:** Frontend'de filtreleme için event type'ları getirir.

**Örnek Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "eventTypes": [
      "LOGIN",
      "LOGOUT",
      "USER",
      "EMPLOYEE",
      "TIMESHEET",
      "MARKER",
      "ANNOUNCEMENT",
      "LOCATION_UNIT",
      "SETTINGS",
      "SECURITY"
    ]
  }
}
```