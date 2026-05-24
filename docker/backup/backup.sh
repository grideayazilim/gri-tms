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
#   - timesheet_postgres container'ı ayakta olmalı
# =============================================================================

set -euo pipefail

# ── Ayarlar ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/var/backups/timesheet}"   # Backup klasörü (override edilebilir)
CONTAINER="timesheet_postgres"                        # PostgreSQL container adı
DB_NAME="${POSTGRES_DB:-timesheet_db}"               # Veritabanı adı
DB_USER="${POSTGRES_USER:-postgres}"                 # Kullanıcı
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

# ── Eski backupları sil (retention policy) ────────────────────────────────────
DELETED=$(find "$BACKUP_DIR" -name "timesheet_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')
if [ "$DELETED" -gt 0 ]; then
  echo "$LOG_PREFIX $DELETED adet eski backup silindi (>${RETENTION_DAYS} gün)."
fi

# ── Mevcut backupları listele ─────────────────────────────────────────────────
TOTAL=$(find "$BACKUP_DIR" -name "timesheet_*.sql.gz" | wc -l | tr -d ' ')
echo "$LOG_PREFIX Toplam $TOTAL backup mevcut."
echo "$LOG_PREFIX Tamamlandı."
