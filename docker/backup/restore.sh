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
BACKUP_DIR="${BACKUP_DIR:-/var/backups/timesheet}"
CONTAINER="${PG_CONTAINER:-gritms-prod-postgres}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:?DB_NAME/POSTGRES_DB tanımlı değil — .env.prod okunamadı}}"
DB_USER="${DB_SUPER_USER:-${POSTGRES_USER:-postgres}}"
DB_APP_USER="${DB_APP_USER:-app_user}"
DB_MIGRATION_USER="${DB_MIGRATION_USER:-migration_user}"
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

# ── Sahiplik ve yetkileri geri ver ─────────────────────────────────────
# pg_restore --no-privileges app_user'ın GRANT'lerini atıyor, 01-init.sh de bir
# daha çalışmıyor; yetkiler burada verilmezse restore sonrası her sorgu
# "permission denied" döner.
echo "$LOG_PREFIX Sahiplik ve yetkiler geri veriliyor..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -c \
  "ALTER DATABASE \"${DB_NAME}\" OWNER TO \"${DB_MIGRATION_USER}\";"

# pg_restore --no-owner her nesneyi postgres'e devrediyor; sahiplik tüm
# şemalarda migration_user'a dönmeli. Yalnızca app şeması yetmez, Drizzle
# migration defterini drizzle şemasında tutuyor.
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<SQL
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  DO \$\$
  DECLARE
    obj record;
  BEGIN
    -- Sistem dışı tüm şemaların sahipliği
    FOR obj IN
      SELECT nspname FROM pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'public')
        AND nspname NOT LIKE 'pg_%'
    LOOP
      EXECUTE format('ALTER SCHEMA %I OWNER TO %I', obj.nspname, '${DB_MIGRATION_USER}');
    END LOOP;

    -- Tabloların sahipliği
    FOR obj IN
      SELECT schemaname, tablename FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND schemaname NOT LIKE 'pg_%'
    LOOP
      EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', obj.schemaname, obj.tablename, '${DB_MIGRATION_USER}');
    END LOOP;

    -- Sequence'lerin sahipliği
    FOR obj IN
      SELECT schemaname, sequencename FROM pg_sequences
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND schemaname NOT LIKE 'pg_%'
    LOOP
      EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO %I', obj.schemaname, obj.sequencename, '${DB_MIGRATION_USER}');
    END LOOP;
  END
  \$\$;

  -- Uygulama kullanıcısının DML yetkileri (yalnızca app şeması)
  GRANT USAGE ON SCHEMA app TO "${DB_APP_USER}";
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO "${DB_APP_USER}";
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO "${DB_APP_USER}";
  ALTER DEFAULT PRIVILEGES FOR ROLE "${DB_MIGRATION_USER}" IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${DB_APP_USER}";
  ALTER DEFAULT PRIVILEGES FOR ROLE "${DB_MIGRATION_USER}" IN SCHEMA app
    GRANT USAGE, SELECT ON SEQUENCES TO "${DB_APP_USER}";
SQL

# ── Server'ı yeniden başlat ───────────────────────────────────────────────────
echo "$LOG_PREFIX Uygulama sunucusu başlatılıyor..."
docker compose -f "$COMPOSE_FILE" start server

# ── Gerçekten çalışıyor mu? ────────────────────────────────────────────
# Sunucunun ayağa kalkması migration + izin adımları yüzünden birkaç saniye
# sürer; tek seferlik 5 sn'lik bekleme yanlış alarm veriyordu.
echo "$LOG_PREFIX Sağlık kontrolü yapılıyor (en fazla 60 sn)..."
HEALTH_MSG="⚠️  Sağlık kontrolü BAŞARISIZ — logları inceleyin: docker compose -f $COMPOSE_FILE logs server"
for _ in $(seq 1 20); do
  sleep 3
  if docker compose -f "$COMPOSE_FILE" exec -T server node -e \
       "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
       >/dev/null 2>&1; then
    HEALTH_MSG="✅ Sağlık kontrolü geçti — sistem kullanıma hazır."
    break
  fi
done

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Geri yükleme tamamlandı!"
echo "  Geri yüklenen backup: $(basename "$BACKUP_FILE")"
echo "  $HEALTH_MSG"
echo "════════════════════════════════════════════════════════"
echo ""
