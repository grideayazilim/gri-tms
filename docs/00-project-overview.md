# Genel Bakış

## 1. Proje Özeti
Projenin geliştirileceği kurumda puantaj takip işleyişi ana hatlarıyla şöyledir: Farklı birimlerde çalışan 
çalışanların puantajları, ilgili birimin sorumluları tarafından Excel formatında merkez birime iletiliyor. 
Merkez birim, farklı birimlerden toplanan puantaj formlarını tek bir Excel dosyasında birleştiriyor. Birleştirilmiş
bu Excel verisi ise ödenek sağlayacak kurumun sistemine işleniyor. Bu süreç tamamiyle manuel ve insan hatasına
fazlasıyla duyarlı.

Puantaj Yönetim Sistemi, birim sorumlularının sorumlu olduğu çalışanların puantajlarını ortak bir sisteme
işlemesini sağlar. Merkez birim, sistemdeki tüm puantajlara erişim sağlayabilmektedir. Böylece kurum bazında 
(istenirse birim bazında) ilgili aya ait tüm puantaj verilerini ve maaş bordrosunu tek tuş ile Excel formatına
çevirebilir ve ödenek sağlayacak kurumun sistemine işleyebilir. Sistemdeki verilerin hepsi kurum içidir.

## 2. Hedef
Aylık puantaj listesi sürecini dijital ortama taşıyarak manuel veri aktarımından kaynaklanan insan hatalarını
en aza indirmek ve süreci merkezi, güvenilir ve denetlenebilir hale getirmek.

### 2.1. Görevler
- Birim sorumlularının sorumlu oldukları çalışanlara ait puantaj verilerini sistem üzerinden girebilmesini sağlamak
- Merkez birim yetkililerinin
- - tüm birimlere ait puantaj verilerini görüntüleyebilmesi ve düzenleyebilmesini sağlamak,
- - ilgili aya ait puantaj verilerini ve buna bağlı maaş bordrolarını Excel formatında dışa aktarabilmesini sağlamak,
- - toplu veya tekli kullanıcı oluşturabilmesini sağlamak,
- - toplu veya tekli çalışan girişi yapabilmesini sağlamak,
- - kuruma yerleşke ve birim ekleyip çıkarabilmesini sağlamak,
- - birim sorumlularının şifre haricindeki verilerini kontrol edip değiştirebilmesini sağlamak
- Girilen puantaj verilerini merkezi bir veritabanında güvenli şekilde saklamak
- Yetkilendirme mekanizması ile kullanıcıların yalnızca sorumlu oldukları birimlere ait verilere erişmesini sağlamak

## 3. Paydaşlar (Stakeholders)
| **Paydaş**                                  | **Rolü**              | **Sistemdeki Beklentisi / Yetkisi**                                                                                                                       |
| ------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Birim Sorumluları**                       | Operasyonel kullanıcı | Sorumlu oldukları birimde çalışan öğrencilerin kontrol listesi ve puantaj verilerini sisteme girebilmek, kendi birimlerine ait verileri görüntüleyebilmek |
| **Merkez Birim Yetkilileri (İŞKUR Birimi)** | Yönetici kullanıcı    | Tüm birimlere ait puantaj verilerini görüntülemek, düzenlemek, raporlamak ve Excel çıktısı almak                                                          |
| **Öğrenciler / Çalışanlar**                 | Dolaylı paydaş        | Kendi çalışma günlerine ait bilgilerin doğru ve eksiksiz şekilde sisteme işlenmesini beklemek                                                             |
| **Kurum Yönetimi**                          | Karar verici          | Kurum genelinde puantaj süreçlerinin merkezi, denetlenebilir ve hatasız yürütülmesini sağlamak                                                            |
| **Bilgi İşlem Birimi**                      | Teknik paydaş         | Sistemin kurum altyapısına uygun, güvenli ve sürdürülebilir şekilde çalışmasını sağlamak                                                                  |

## 4. Kullanıcılar ve Yetkilendirme Modeli
Puantaj Yönetim Sistemi, klasik rol tabanlı (role-based) yetkilendirme yaklaşımı yerine, kapsam (scope) tabanlı bir
yetkilendirme modeli ile tasarlanmıştır. Bu yaklaşım, kullanıcıların yalnızca sahip oldukları roller doğrultusunda 
değil, aynı zamanda yetkili oldukları yerleşke ve birimler kapsamında işlem yapabilmesini sağlar.

Kurum yapısı gereği:
- Bir yerleşkede birden fazla birim bulunabilir
- Aynı birim, birden fazla yerleşkede faaliyet gösterebilir
- Bir birim sorumlusu:
- - Tüm yerleşkelerdeki ilgili birimden sorumlu olabilir
- - Yalnızca belirli bir yerleşkedeki belirli bir birimden sorumlu olabilir

Bu esnek yapıyı desteklemek amacıyla sistem, yetkilendirmeyi kullanıcı + yerleşke + birim üçlüsü üzerinden 
değerlendirir.

## 5. İşlevsel Gereksinimler (Functional Requirements)
Sistem aşağıdaki işlevleri sağlamalıdır:

### 5.1. Çalışan Veri Girişi
- Bir Excel dosyasından toplu veya admin panelinden tekli olarak sisteme çalışan verisi girilebilmelidir.
- Admin çalışanların verilerini görebilir ve güncelleyebilir.
- Birim sorumlusu yalnızca kendi sorumluluğundaki çalışanların verisini görebilir. Sorumluluğundaki çalışanın
yalnızca puantaj tablosunu güncelleyebilir.

### 5.2. Kullanıcı ve Yetkilendirme
- Sistem admin ve birim sorumlusu olmak üzere farklı kullanıcı tiplerini desteklemelidir.
- Yukarıdaki başlıkta bahsedilen sebepten rol + kapsam tabanlı yetkilendirme modeli desteklenmelidir.
- Birim sorumluları, yalnızca yetkili oldukları yerleşke ve birimlere ait verileri görüntüleyebilmelidir.
- Birim sorumluları, başka birimlerin veya kapsam dışı yerleşkelerin verilerine erişememeli ve bu verileri
değiştirememelidir.
- Admin kullanıcılar, sistemdeki tüm yerleşke ve birimlere ait verilere erişebilmelidir.
- Adminler, kullanıcıların yetkili olduğu birim ve yerleşke kapsamlarını değiştirebilmelidir.

### 5.3. Puantaj Yönetimi
- Puantaja işaretlenebilecek bilgiler (admin isterse bu seçeneklere ekleme yapabilmelidir):
- - X: Geldi
- - İ: İzinli
- - R: Raporlu
- - RT: Resmi Tatil
- - DT: Devlet Tatili (Sömestır vb.)
- Sistem, her öğrenci için gün bazlı puantaj verisi girilmesini sağlamalıdır.
- Birim sorumluları, sorumlu oldukları öğrencilerin puantajlarını sisteme girebilmelidir.
- Sistem, puantaj verileri girilirken çalışanın haftada en fazla üç gün çalışıp çalışmadığını kontrol edebilmeli
ve anında sistem kullanıcısına uyarı verebilmelidir.
- Puantaj girişleri, çalışma ayını takip eden ilk iki gün içerisinde yapılmalıdır.
- Adminler, gerekli durumlarda girilen puantaj verilerini düzenleyebilmelidir.
- Günlük ödenek tutarı sistemde parametre olarak tanımlanabilmelidir.

### 5.4. Raporlama ve Çıktılar
- Sistem, puantaj ve buna bağlı olarak oluşturulan maaş bordrosu verilerini
tek tuşla Excel formatına dönüştürebilmelidir.
- Günlük ödenek tutarları sistemde parametre olarak tanımlanabilmelidir.
- Adminler, kurum genelinde veya birim bazında raporlar alabilmelidir.

### 5.5. Kullanıcı Yönetimi
- Birim sorumluları sistem üzerinden tekli veya Excel üzerinden toplu halde sisteme eklenebilmelidir.
- Adminler sistem üzerinden tekli şekilde eklenebilmelidir.
- Oluşturulan kullanıcıya mail üzerinden geçici kullanıcı adı ve şifresi iletilmeli, sisteme giriş yaptığında
bu verileri zorunlu olarak değiştirmesi istenmelidir.
- Kullanıcı hesapları için geçerlilik süresi (expiry date) tanımlanabilmelidir.
- Varsayılan geçerlilik süresi, sistemde parametre olarak tutulabilen, o yılın çalışma programının bitiş tarihidir.
- Geçerlilik süresi dolan kullanıcı hesapları sistemden otomatik silinebilmelidirler.
- Birim sorumluları geçerlilik süresi ve sorumlu olduğu alan haricindeki bilgilerini güncelleyebilmelidir.
- Birim sorumluları kendileri hariç diğer kullanıcılarının hiçbir verisin görmemeli ve değiştirmemelidir.
- Adminler, birim sorumlularının geçerlilik süresini ve sorumlu olduğu birimi ve yerleşkeyi değiştirebilmelidir.

### 5.6. Duyuru Sistemi
- Sistem, duyuru paylaşımını desteklemelidir.
- Adminler tüm kullanıcıların görebileceği duyurular oluşturabilmelidirler.

## 6. İşlevsel Olmayan Gereksinimler (Non-Functional Requirements)
Sistem aşağıdaki kalite gereksinimlerini sağlamalıdır:

### 6.1. Güvenlik
- Yetkilendirme kuralları sistemin tüm katmanlarında tutarlı şekilde uygulanmalıdır.
- Yetkisiz veri erişimleri kesin olarak engellenmelidir.
- Kullanıcı kimlik doğrulama ve yetkilendirme işlemleri güvenli bir şekilde gerçekleştirilmelidir.
- Hassas kullanıcı verileri yetkisiz kişilerle kesinlikle paylaşılmamalıdır.

### 6.2. Performans
- Sistem, puantaj ve raporlama işlemlerini kabul edilebilir süreler içerisinde tamamlamalıdır.
- Çok sayıda birim ve kullanıcıya ait veriler üzerinde çalışırken performans kaybı yaşanmamalıdır.
- Excel çıktı alma işlemleri kullanıcıyı bekletmeyecek şekilde optimize edilmelidir.

### 6.3. Veri Tutarlılığı ve Doğruluk
- Puantaj verileri merkezi bir veritabanında tutarlı şekilde saklanmalıdır.
- Aynı verinin farklı kaynaklardan çelişkili biçimde girilmesi engellenmelidir.
- Yetkilendirme kuralları sayesinde veri bütünlüğü korunmalıdır.

### 6.4. Kullanılabilirlik
- Sistem, birim sorumluları ve adminler tarafından kolay öğrenilebilir ve kullanılabilir olmalıdır.
- Manuel işlemleri azaltarak kullanıcıların iş yükünü hafifletmelidir.

### 6.5. Sürdürülebilirlik ve Ölçeklenebilirlik
- Sistem, yeni yerleşke ve birimlerin eklenmesine uygun şekilde tasarlanmalıdır.
- Yetkilendirme yapısı, kurum büyüdükçe ek geliştirme gerektirmeden çalışabilmelidir.

## 7. İş Kuralları (Business Rules)
- Birim sorumluları, puantaj verilerini yalnızca ilgili çalışma ayını takip eden çalışma ayının ilk iki
çalışma gününde (ayın ilk çalışma günü tatile denk gelebilir!!) doldurmalıdır.
- Bu süre dışında yapılan puantaj giriş talepleri sistem tarafından otomatik olarak reddedilir.
- Bir öğrenci için aynı gün içerisinde yalnızca tek bir çalışma durumu (geldi, izinli, raporlu, resmi tatil vb.) 
tanımlanabilir.
- Birim sorumluları, kapsam (yerleşke–birim) yetkileri dışında kalan öğrenci veya puantaj verilerine erişemez ve 
bu veriler üzerinde işlem yapamaz.
- Admin kullanıcılar, gerekli durumlarda puantaj verileri üzerinde düzenleme yapabilir.
- Aynı puantaj kaydı üzerinde eş zamanlı güncelleme yapılması durumunda sistem, veri çakışmalarını önlemek için 
güncelleme kontrolü uygular.
- Tüm puantaj güncellemeleri kim tarafından ve ne zaman yapıldığı bilgisiyle birlikte kayıt altına alınır.

## 8. Varsayımlar ve Kısıtlar (Assumptions And Constraints)

### 8.1. Varsayımlar
- Sistem yalnızca kurum içi kullanım için tasarlanmıştır.
- Puantaj verileri, birim sorumluları tarafından doğru ve eksiksiz şekilde girileceği varsayımıyla işlenir.
- Günlük ödenek tutarlarının sistemde tanımlı ve güncel olduğu kabul edilir.

### 8.2. Kısıtlar
- Sistem, ödenek sağlayacak kurumun sistemleriyle doğrudan entegrasyon sağlamaz.
- Maaş ödeme işlemleri sistem kapsamı dışındadır.

## Başarı Kriterleri (Success Criteria)
Sistemin başarılı kabul edilebilmesi için sağlanması gereken ölçütler:

- Sistem, birim sorumlularının puantaj verilerini yalnızca tanımlı süre içerisinde girmesini sağlamalıdır.
- Sistem, yetkisiz kullanıcıların kapsam dışı verilere erişimini tamamen engellemelidir.
- Aynı gün için birden fazla çalışma durumu girilmesini önlemelidir.
- Admin kullanıcılar, tüm puantaj verilerini eksiksiz şekilde görüntüleyebilmeli ve raporlayabilmelidir.
- Sistem, örnek bir çalışma ayı için eksiksiz ve hatasız Excel çıktısı üretebilmelidir.
- Sistem, manuel süreçlere kıyasla insan hatasını belirgin şekilde azaltmalıdır.