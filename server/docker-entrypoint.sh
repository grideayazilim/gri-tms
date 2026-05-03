#!/bin/sh
set -e

echo "[entrypoint] PostgreSQL hazır olana kadar bekleniyor..."

# pg_isready ile DB bağlantısı hazır olana kadar bekle (max 60 deneme = 60s)
RETRIES=60
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_MIGRATION_USER:-migration_user}" -q; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -eq 0 ]; then
    echo "[entrypoint] PostgreSQL'e bağlanılamadı — zaman aşımı."
    exit 1
  fi
  sleep 1
done

echo "[entrypoint] PostgreSQL hazır."

# Migration + şema grant (docker-setup.js migration_user ile bağlanır ve çalışır)
echo "[entrypoint] Migration ve şema yapılandırması başlatılıyor..."
node dist/database/docker-setup.js

echo "[entrypoint] Hazır. Sunucu başlatılıyor..."
exec "$@"
