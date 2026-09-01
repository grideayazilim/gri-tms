#!/usr/bin/env bash
# =============================================================================
# backup.sh — PostgreSQL Otomatik Yedekleme
#
# Kullanım (manuel):
#   ./docker/backup/backup.sh
#
# Cron kurulumu (sunucuda bir kez çalıştır):
#   crontab -e
#   0 3 * * * /path/to/project/docker/backup/backup.sh >> /var/log/timesheet-backup.log 2>&1
#
# Gereksinimler:
#   - docker (çalışıyor olmalı)
#   - gritms-prod-postgres container'ı ayakta olmalı
# =============================================================================

set -euo pipefail

# ── .env.prod'u oku ────────────────────────────────────────────────────
# Cron ortamında POSTGRES_DB gibi değişkenler tanımlı olmuyor; sabit bir
# fallback veritabanı adı yerine .env.prod doğrudan okunur.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/../../apps/management/server/.env.prod}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
else
  echo "UYARI: $ENV_FILE bulunamadı — ortam değişkenleri kullanılacak." >&2
fi

# ── Ayarlar ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/var/backups/timesheet}"   # Backup klasörü (override edilebilir)
CONTAINER="${PG_CONTAINER:-gritms-prod-postgres}"      # PostgreSQL container adı
DB_NAME="${DB_NAME:-${POSTGRES_DB:?DB_NAME/POSTGRES_DB tanımlı değil — .env.prod okunamadı}}"
DB_USER="${DB_SUPER_USER:-${POSTGRES_USER:-postgres}}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"               # Kaç günlük backup saklanacak
DATE=$(date +"%Y-%m-%d_%H-%M")
BACKUP_FILE="${BACKUP_DIR}/timesheet_${DATE}.sql.gz"
LOG_PREFIX="[BACKUP $(date '+%Y-%m-%d %H:%M:%S')]"

# ── Klasör oluştur ────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "$LOG_PREFIX Yedekleme başladı → $BACKUP_FILE"

# ── Container çalışıyor mu? ───────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "$LOG_PREFIX HATA: '$CONTAINER' container'ı çalışmıyor!" >&2
  exit 1
fi

# ── pg_dump çalıştır ──────────────────────────────────────────────────────────
if docker exec "$CONTAINER" \
    pg_dump -U "$DB_USER" "$DB_NAME" \
    --no-password \
    --format=custom \
  | gzip > "$BACKUP_FILE"; then

  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  echo "$LOG_PREFIX Yedekleme başarılı. Boyut: $SIZE"
else
  echo "$LOG_PREFIX HATA: pg_dump başarısız!" >&2
  rm -f "$BACKUP_FILE"  # yarım dosyayı sil
  exit 1
fi

# ── Yedeği doğrula ─────────────────────────────────────────────────────
# Dosyanın okunabilir bir dump olduğunu pg_restore --list gösterir. Boyut
# kontrolü yalnızca kesilmiş/boş dosya içindir; sıfırlama sonrası küçük ama
# geçerli bir yedek normaldir.
BYTES=$(wc -c < "$BACKUP_FILE" | tr -d ' ')

if ! gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" pg_restore --list > /dev/null 2>&1; then
  echo "$LOG_PREFIX HATA: Yedek doğrulanamadı — dosya bozuk veya okunamıyor!" >&2
  exit 1
fi

# Kesilmiş/boş dosya: gzip başlığı bile 1 KB'ı zor geçer
if [ "$BYTES" -lt 1024 ]; then
  echo "$LOG_PREFIX HATA: Yedek dosyası boş görünüyor (${BYTES} bayt)!" >&2
  exit 1
fi

# Bilgilendirme: alışılmadık küçüklük (yeni sıfırlanmış sistemde normaldir)
if [ "$BYTES" -lt 10240 ]; then
  echo "$LOG_PREFIX NOT: Yedek küçük (${BYTES} bayt) — sistem yeni sıfırlanmışsa normaldir."
fi

echo "$LOG_PREFIX Yedek doğrulandı (okunabilir, ${BYTES} bayt)." 

# ── Eski backupları sil (retention policy) ────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "timesheet_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')
if [ "$DELETED" -gt 0 ]; then
  echo "$LOG_PREFIX $DELETED adet eski backup silindi (>${RETENTION_DAYS} gün)."
fi

# ── Mevcut backupları listele ─────────────────────────────────────────────────
TOTAL=$(find "$BACKUP_DIR" -name "timesheet_*.sql.gz" | wc -l | tr -d ' ')
echo "$LOG_PREFIX Toplam $TOTAL backup mevcut."
echo "$LOG_PREFIX Tamamlandı."
