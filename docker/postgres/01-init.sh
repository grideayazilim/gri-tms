#!/bin/bash
# ============================================================================
# PostgreSQL İlk Başlatma Scripti
# Docker container ilk kez başladığında POSTGRES_DB ile birlikte çalışır.
# Uygulama ve migration kullanıcılarını oluşturur, DB sahipliğini ayarlar.
#
# NOT: Şifrelerde $, ', " ve \ karakterleri kullanmaktan kaçının.
# ============================================================================
set -e

echo "[postgres-init] Veritabanı kullanıcıları oluşturuluyor..."

# uuid-ossp eklentisi (UUID üretimi için)
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# migration_user oluştur / şifresini güncelle
if psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_MIGRATION_USER}'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "ALTER USER \"${DB_MIGRATION_USER}\" WITH PASSWORD '${DB_MIGRATION_PASSWORD}';"
else
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "CREATE USER \"${DB_MIGRATION_USER}\" WITH PASSWORD '${DB_MIGRATION_PASSWORD}';"
fi

# app_user oluştur / şifresini güncelle
if psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
       -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_APP_USER}'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "ALTER USER \"${DB_APP_USER}\" WITH PASSWORD '${DB_APP_PASSWORD}';"
else
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "CREATE USER \"${DB_APP_USER}\" WITH PASSWORD '${DB_APP_PASSWORD}';"
fi

# Veritabanı sahipliğini migration_user'a ver (şema oluşturabilmesi için)
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "ALTER DATABASE \"${POSTGRES_DB}\" OWNER TO \"${DB_MIGRATION_USER}\";"

echo "[postgres-init] Kullanıcılar başarıyla oluşturuldu."
