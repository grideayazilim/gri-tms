# Mimari Yapı
Projeye genel bakış raporunda da belirtildiği üzere, sistem iki temel kullanıcı rolü üzerine oluşturulmuştur: Admin ve Birim Sorumlusu.
Sistem mimarisi, bu rol ayrımı temel alınarak tasarlanmış olup; kullanıcı arayüzü, yetkilendirme mekanizmaları ve veri erişim katmanları bu roller doğrultusunda yapılandırılmıştır.

## 1. Frontend

### 1.1. Sayfa Bazlı Detaylar

### 1.1.1. Giriş Sayfası
**Amaç:** Kullanıcıların sisteme kimlik doğrulama ile giriş yapmasını sağlar.
**İçerik:**
- Kullanıcı Adı / Şifre Girişi
- Giriş Butonu
**Erişim:** Tüm kullanıcılar

### 1.1.2. Ana Sayfa 
**Amaç:** Kullanıcıların sorumlu olduğu çalışanların puantajlarını düzenleyebilmesini ve
ilgili puantajlar ile oluşturulan istatistik verilerinin incelenebilmesini sağlar.
**İçerik:**
- Sorumlu olunan yerleşke/birim yazısı (admin yerleşke/birim seçimi yapabilir)
- Dashboard
- - Kullanıcı bilgisi
- - Aktif çalışma ayı bilgisi
- - İlgili yerleşke/birimdeki çalışan sayısı
- - İlgili yerleşke/birimdeki çalışanların puantaj durumu (X tane girilmedi, X tane girildi)
- - İlgili yerleşke/birimdeki çalışanlara ödenecek toplam miktar, çalışılan toplam gün
- Puantaj Yönetim Alanı
- - İlgili yerleşke/birimde çalışanların listesi
- - Her bir çalışanın üzerine tıklandığında açılan, farklı işaretçiler ile (X, İ, R, ...) işaretlenebilir puantaj
alanı ve kaydetme butonu
- - Öğrenci arama alanı (T.C. veya isim ile)
- - Excel formatında puantaj formu çıkarma butonu
- - Excel formatında öğrenci listesi çıkarma butonu
**Erişim:** Tüm kullanıcılar
- Birim sorumlusu YALNIZCA kendi sorumlu olduğu çalışanların verisine erişebilir
- Admin yerleşke/birim yazısı üzerinden seçim yaparak tüm verilere ulaşabilir.

### 1.1.3. Yerleşke/Birim Yönetim Sayfası
**Amaç:** Adminlerin kurumdaki yerleşke ve birimleri silmesini, düzenlemesini ve yenilerini eklemesini
sağlar.
**İçerik:** Tree benzeri yapı.
- Kurum adı
- Yerleşkeler
- Her yerleşkenin altında o yerleşkeye ait birimler (program numaraları ile birlikte)
- Her yerleşke ve birimin altında ilgili yapıya ait toplam sorumlu ve çalışan sayısı bilgisi
- Yerleşke/birim silme butonu
- Değişiklikleri kaydetme, vazgeçme butonu
**Erişim:** Yalnızca adminler

### 1.1.4. Çalışan/Sorumlu Yönetim Sayfası
**Amaç:** Adminlerin sisteme toplu veya tekli sorumlu/çalışan ekleyebilmesini, mevcut sorumlu/çalışan
verilerini görüntüleyip güncelleyebilmesini sağlar.
**İçerik:** 
- Filtreleme alanı
- - Yerleşke, birim seçimi
- - Çalışanları/sorumluları görüntüleme seçimi
- Liste alanı
- - Çalışan YA DA sorumlu listesi
- - Her satırda yer alan bilgileri güncelle butonu
- Çalışan/Sorumlu ekleme alanı
- - Excel ile toplu çalışan/sorumlu ekleme
- - Input alanları ile tekli çalışan/sorumlu ekleme
**Erişim:** Yalnızca adminler

### 1.1.5. Ayarlar Sayfası
**Amaç:** Kullanıcıların kendine ait değiştirebileceği bilgileri değiştirebilmesini, ayrıca adminlerin
sistem parametrelerini yönetmesini sağlar.
**İçerik:**
- Kullanıcı bilgi güncelleme alanı
- - Yalnızca kullanıcı adı ve şifre
- Çalışanların günlük ödenek miktarı
- Çalışanın haftada en fazla kaç gün çalışabileceği
- Puantaj işaretçi ayarı. Admin yeni madde ekleyebilir:
- - X: Geldi
- - İ: İzinli
- - R: Raporlu
- - DT: Devlet Tatili (Sömestır vb.)
- - RT: Resmi Tatil
**Erişim:** Tüm kullanıcılar (sorumlular kullanıcı bilgi güncelleme alanı haricinde hiçbir şey görmeyecek)

### 1.1.6. Duyuru Sayfası
**Amaç:** Adminlerin sistemdeki tüm kullanıcılara duyuru yapabilmesini sağlamak.
**İçerik:**
- Duyuru listesi
- Duyuru oluşturma butonu
- Duyuru oluşturma ekranı
**Erişim:** Tüm kullanıcılar (sorumlular yalnızca duyuru listesini görür.)

### 1.2 Erişim Kontrolü ve Güvenlik
Sayfa erişimleri rol bazlıdır. Yetkisiz kullanıcılar ilgili sayfalara yönlendirilemez. Frontend tarafında sayfalara ve yapılara erişim kontrolü yapılır. Raporun devamında da görüleceği üzere backend ve database üzerinde veri güvenliği için ekstra katmanlar sağlanmıştır.

## 2. Backend

## 3. Veri Modeli

## 4. İlişkili Tablo

## 5. Security & Access Kontrol
- jwt, RLS

## 6. Deployment

## 7. Teknoloji Stack'i
