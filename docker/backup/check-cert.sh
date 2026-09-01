#!/usr/bin/env bash
# =============================================================================
# check-cert.sh — TLS sertifikası son kullanma kontrolü
#
# Let's Encrypt kullanılıyorsa yenilemeyi certbot servisi yapar; kurumsal iç
# CA'da otomatik yenileme genelde yok, bu script erken uyarı verir.
#
# Cron kurulumu (sunucuda bir kez):
#   crontab -e
#   0 8 * * * /path/to/project/docker/backup/check-cert.sh >> /var/log/timesheet-cert.log 2>&1
#
# Çıkış kodları: 0 = sorun yok, 1 = uyarı eşiğinin altında veya dosya yok
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

CERT_FILE="${CERT_FILE:-$PROJECT_DIR/docker/nginx/certs/fullchain.pem}"
WARN_DAYS="${WARN_DAYS:-30}"
LOG_PREFIX="[CERT $(date '+%Y-%m-%d %H:%M:%S')]"

if [ ! -f "$CERT_FILE" ]; then
  echo "$LOG_PREFIX HATA: Sertifika dosyası bulunamadı: $CERT_FILE" >&2
  exit 1
fi

END_DATE_RAW="$(openssl x509 -enddate -noout -in "$CERT_FILE" 2>/dev/null | cut -d= -f2)"
if [ -z "$END_DATE_RAW" ]; then
  echo "$LOG_PREFIX HATA: Sertifika okunamadı: $CERT_FILE" >&2
  exit 1
fi

# macOS (BSD date) ve Linux (GNU date) uyumluluğu
if date -d "$END_DATE_RAW" +%s >/dev/null 2>&1; then
  END_TS="$(date -d "$END_DATE_RAW" +%s)"
else
  END_TS="$(date -j -f "%b %d %T %Y %Z" "$END_DATE_RAW" +%s 2>/dev/null)"
fi

if [ -z "${END_TS:-}" ]; then
  echo "$LOG_PREFIX HATA: Sertifika bitiş tarihi ayrıştırılamadı: $END_DATE_RAW" >&2
  exit 1
fi

DAYS_LEFT=$(( (END_TS - $(date +%s)) / 86400 ))

if [ "$DAYS_LEFT" -lt 0 ]; then
  echo "$LOG_PREFIX ❌ SERTİFİKA SÜRESİ DOLMUŞ ($(( -DAYS_LEFT )) gün önce)! Sistem erişilemez durumda." >&2
  exit 1
elif [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
  echo "$LOG_PREFIX ⚠️  UYARI: Sertifikanın bitmesine $DAYS_LEFT gün kaldı ($END_DATE_RAW)." >&2
  echo "$LOG_PREFIX     Let's Encrypt: certbot servisinin çalıştığını doğrulayın." >&2
  echo "$LOG_PREFIX     Kurumsal iç CA: yeni sertifika için bilgi işlemle iletişime geçin." >&2
  exit 1
else
  echo "$LOG_PREFIX ✅ Sertifika geçerli, $DAYS_LEFT gün kaldı ($END_DATE_RAW)."
fi
