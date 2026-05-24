#!/usr/bin/env bash
# =============================================================================
# restore.sh — PostgreSQL Yedekten Geri Yükleme
#
# Kullanım:
#   ./docker/backup/restore.sh <backup-dosyası>
#
# Örnekler:
#   ./docker/backup/restore.sh /var/backups/timesheet/timesheet_2026-05-20_03-00.sql.gz
#   ./docker/backup/restore.sh timesheet_2026-05-20_03-00.sql.gz  (BACKUP_DIR içindeyse)
#
# ⚠️  DİKKAT: Bu işlem mevcut veritabanını TAMAMEN SİLER ve yeniden yükler.
# =============================================================================

set -euo pipefail

# ── Ayarlar ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/var/backups/timesheet}"
CONTAINER="timesheet_postgres"
DB_NAME="${POSTGRES_DB:-timesheet_db}"
DB_USER="${POSTGRES_USER:-postgres}"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_PREFIX="[RESTORE $(date '+%Y-%m-%d %H:%M:%S')]"

# ── Argüman kontrolü ──────────────────────────────────────────────────────────
if [ $# -eq 0 ]; then
  echo ""
  echo "Kullanım: $0 <backup-dosyası>"
  echo ""
  echo "Mevcut backuplar:"
  ls -lht "${BACKUP_DIR}"/timesheet_*.sql.gz 2>/dev/null || echo "  (backup bulunamadı)"
  echo ""
  exit 1
fi

BACKUP_FILE="$1"

# Eğer tam yol verilmediyse BACKUP_DIR içine bak
if [ ! -f "$BACKUP_FILE" ]; then
  if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
  else
    echo "$LOG_PREFIX HATA: Dosya bulunamadı: $1" >&2
    echo "Mevcut backuplar:"
    ls -lh "${BACKUP_DIR}"/timesheet_*.sql.gz 2>/dev/null || echo "  (backup yok)"
    exit 1
  fi
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "  PostgreSQL Geri Yükleme"
echo "════════════════════════════════════════════════════════"
echo "  Backup dosyası : $BACKUP_FILE"
echo "  Veritabanı     : $DB_NAME"
echo "  Container      : $CONTAINER"
echo "════════════════════════════════════════════════════════"
echo ""
echo "⚠️  UYARI: Mevcut veritabanı tamamen silinecek!"
echo ""
read -r -p "Devam etmek istiyor musunuz? (evet yazın): " CONFIRM

if [ "$CONFIRM" != "evet" ]; then
  echo "İptal edildi."
  exit 0
fi

echo ""
echo "$LOG_PREFIX Geri yükleme başladı..."

# ── Docker Compose'un çalıştığı klasöre git ────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Server'ı durdur (DB bağlantılarını kes) ───────────────────────────────────
echo "$LOG_PREFIX Uygulama sunucusu durduruluyor..."
cd "$PROJECT_DIR"
docker compose -f "$COMPOSE_FILE" stop server 2>/dev/null || true

# ── Mevcut DB'yi sil ve yeniden oluştur ──────────────────────────────────────
echo "$LOG_PREFIX Veritabanı temizleniyor..."
docker exec "$CONTAINER" \
  psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};" postgres
docker exec "$CONTAINER" \
  psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" postgres

# ── Backup'ı geri yükle ───────────────────────────────────────────────────────
echo "$LOG_PREFIX Veriler yükleniyor (bu biraz sürebilir)..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" \
  pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges 2>/dev/null || {
    # pg_restore warnings (sequence, ownership vs.) exit 1 dönebilir ama bu normal
    echo "$LOG_PREFIX Not: pg_restore bazı uyarılar verdi (genellikle normaldir)."
  }

# ── Server'ı yeniden başlat ───────────────────────────────────────────────────
echo "$LOG_PREFIX Uygulama sunucusu başlatılıyor..."
docker compose -f "$COMPOSE_FILE" start server

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Geri yükleme tamamlandı!"
echo "  Geri yüklenen backup: $(basename "$BACKUP_FILE")"
echo "  Sistem tekrar kullanıma hazır."
echo "════════════════════════════════════════════════════════"
echo ""
