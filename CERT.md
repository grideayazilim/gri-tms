# 🔐 TLS Sertifikası

nginx yalnızca iki dosyayı okur:

```
docker/nginx/certs/fullchain.pem
docker/nginx/certs/privkey.pem
```

Dosyalar yoksa veya anahtar sertifikayla uyuşmuyorsa **nginx başlamaz** ve
sisteme giriş yapılamaz. Süresi dolmuş sertifikayla nginx başlar, bu kez
bağlantıyı tarayıcı reddeder.

---

## Senaryo seçimi

| Durum | İzlenecek yol |
|---|---|
| Kurum sertifika sağlayacak | [Senaryo A](#senaryo-a--kurumdan-sertifika) |
| Sağlamayacak veya henüz gelmedi | [Senaryo B](#senaryo-b--kendinden-imzalı) |

Sistem sertifika beklenmeden Senaryo B ile devreye alınır; kalıcı sertifika
geldiğinde [iki dosya değiştirilir](#sertifikanın-kurulumu) ve sistem bu işlem
sırasında ayakta kalır.

---

## Senaryo A — Kurumdan sertifika

Sürece başlamadan önce kurumdan şu teyit alınmalıdır: **CSR tarafımızca mı
gönderilecek, yoksa anahtar ve sertifika kurum tarafından mı üretilecek?**
Kurum üretecekse dosya genellikle `.pfx` formatında gelir;
[PFX / P12 dönüştürme](#pfx--p12-geldiyse) bölümüne geçilir.

### 1. CSR üretimi

```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout docker/nginx/certs/privkey.pem -out istek.csr \
  -subj "/C=TR/O=Ankara Yildirim Beyazit Universitesi/CN=iskur.aybu.edu.tr" \
  -addext "subjectAltName=DNS:iskur.aybu.edu.tr,IP:10.20.30.40"
```

Gönderilmeden önce SAN alanı doğrulanır:

```bash
openssl req -in istek.csr -noout -text | grep -A2 "Alternative"
```

Yalnızca `istek.csr` gönderilir. **`privkey.pem` sunucuda kalır, hiçbir koşulda
paylaşılmaz.**

### 2. Sertifikayla birlikte talep edilecekler

* Sertifika **PEM formatında**
* **Ara ve kök CA sertifikaları** — zincir eksikse bazı tarayıcılar uyarı vermeye devam eder
* `subjectAltName` alanının dolu olması — güncel tarayıcılar `CN` alanına bakmaz
* **Geçerlilik bitiş tarihi**

> ⚠️ Kurumun kök CA sertifikasının istemci makinelere dağıtılıp dağıtılmadığı
> (GPO/MDM) baştan teyit edilmelidir. Dağıtılmıyorsa imzalı sertifika da tarayıcı
> uyarısını kaldırmaz.

### 3. Sertifika geldiğinde

[Sertifikanın kurulumu](#sertifikanın-kurulumu) bölümüne geçilir.

---

## Senaryo B — Kendinden imzalı

Trafiği eksiksiz şifreler; kullanıcılar ilk girişte tarayıcı uyarısı görür ve
"Gelişmiş → Yine de devam et" adımını geçer.

```bash
mkdir -p docker/nginx/certs docker/nginx/certbot-www

openssl req -x509 -newkey rsa:2048 -nodes -days 1095 \
  -keyout docker/nginx/certs/privkey.pem \
  -out    docker/nginx/certs/fullchain.pem \
  -subj "/C=TR/O=Ankara Yildirim Beyazit Universitesi/CN=iskur.aybu.edu.tr" \
  -addext "subjectAltName=DNS:iskur.aybu.edu.tr,IP:10.20.30.40"

chmod 600 docker/nginx/certs/privkey.pem
```

Doğrulama — adres ve bitiş tarihi görünmelidir:

```bash
openssl x509 -in docker/nginx/certs/fullchain.pem -noout -subject -enddate -ext subjectAltName
```

DNS adı henüz tahsis edilmediyse `CN` alanına IP yazılır ve SAN'dan `DNS:` kısmı
çıkarılır.

> 🔁 Sertifika yalnızca IP'ye bağlıysa, **IP değiştiğinde** süre dolmamış olsa da
> yeniden üretilmelidir. DNS adı varsa sertifika isme bağlanır ve IP değişse de
> geçerli kalır.

---

## Sertifikanın kurulumu

Senaryo A'da sertifika geldiğinde ve her yenilemede aynı adımlar uygulanır.

```bash
# 1. Zincir birleştirilir — sıra önemli, sunucu sertifikası en üstte
cat sunucu.crt ara-ca.crt kok-ca.crt > fullchain.pem

# 2. Anahtar ile sertifika eşleşmesi — iki çıktı birebir aynı olmalı
openssl x509 -noout -modulus -in fullchain.pem | openssl md5
openssl rsa  -noout -modulus -in privkey.pem   | openssl md5

# 3. Dosyalar yerleştirilir ve nginx yeniden başlatılır
cp fullchain.pem docker/nginx/certs/fullchain.pem
cp privkey.pem   docker/nginx/certs/privkey.pem
docker compose -f docker-compose.prod.yml restart client

# 4. Dışarıdan doğrulama — issuer alanında imzalayan CA'nın adı görünmeli
echo | openssl s_client -connect iskur.aybu.edu.tr:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -enddate -ext subjectAltName
```

**2. adım atlanmamalıdır.** Uyuşmayan çiftte nginx açılmaz ve sistem erişilemez
hale gelir; kontrol kopyalamadan *önce* yapılır.

Tarayıcıda uyarı sürüyorsa zincir eksiktir veya kök CA ilgili makineye
dağıtılmamıştır.

### PFX / P12 geldiyse

```bash
openssl pkcs12 -in sertifika.pfx -nocerts -nodes -out privkey.pem
openssl rsa    -in privkey.pem -out privkey.pem
openssl pkcs12 -in sertifika.pfx -clcerts -nokeys -out sunucu.crt
openssl pkcs12 -in sertifika.pfx -cacerts -nokeys -chain -out zincir.crt
cat sunucu.crt zincir.crt > fullchain.pem
```

Dosya şifresi sertifikayı gönderen birimden talep edilir.

### Erişim adresi değişiyorsa

IP'den DNS adına geçiliyorsa iki değişken de güncellenir:

* `apps/management/server/.env.prod` → `FRONTEND_URL=https://iskur.aybu.edu.tr`
* `apps/bot/server/.env.prod` → `ALLOWED_ORIGIN=https://iskur.aybu.edu.tr`

```bash
docker compose -f docker-compose.prod.yml restart server bot-server
```

İkisi de CORS origin'idir ve yanlış değer sistemi durdurmaz; girişi kıran ayar
`COOKIE_SECURE`'dur.

---

## Yenileme

| | Kurumsal sertifika | Kendinden imzalı |
|---|---|---|
| **Süre** | Kurumun bildirdiği süre | 3 yıl |
| **Yenileme** | Kuruma yeniden başvurulur | Senaryo B komutu tekrarlanır |
| **İstemci tarafı** | Etkilenmez | Uyarı herkes için yeniden çıkar |
| **Harekete geçme** | 60 gün kala | 30 gün kala |

**Yenilenmediğinde sistem tamamen erişilemez hale gelir.** Kurumsal sertifikaların
süresi bir yıldan kısa olabilir (ör. 198 gün).

Bitiş tarihi sertifika teslim alınırken öğrenilmeli ve sorumlu personele söylenmelidir.

Bitiş tarihi istenildiği anda şu komutla öğrenilir:

```bash
openssl x509 -enddate -noout -in docker/nginx/certs/fullchain.pem
```

---

## Sorun giderme

| Belirti | Sebep | Çözüm |
|---|---|---|
| Site açılmıyor, "bağlantı reddedildi" | nginx sertifika dosyalarını bulamadı | `docker compose -f docker-compose.prod.yml logs client` — iki dosya doğru isimle yerinde mi |
| Yeni sertifika sonrası nginx açılmıyor | Anahtar ile sertifika eşleşmiyor | Modulus kontrolü (2. adım), eşleşen çiftle tekrar kopyalanır |
| İmzalı sertifikada uyarı sürüyor | Zincir eksik veya kök CA istemcide yok | Ara + kök CA `fullchain.pem`'e eklenir, kök dağıtımı teyit edilir |
| Giriş ekranı geliyor, giriş yapılamıyor | HTTPS yokken `COOKIE_SECURE=true` | `.env.prod` düzeltilir, `restart server` |

> `docker-compose.prod.yml` içindeki `certbot` servisi Let's Encrypt içindir ve
> `--profile letsencrypt` verilmedikçe çalışmaz. İç ağ kurulumunda kullanılmaz.
