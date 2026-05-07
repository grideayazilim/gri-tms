#!/bin/bash
# ============================================================================
# PostgreSQL İlk Başlatma Scripti
# Docker container ilk kez başladığında çalışır.
# Veritabanını, uygulama ve migration kullanıcılarını oluşturur, sahipliği ayarlar.
# ============================================================================
set -e

echo "[postgres-init] Veritabanı ve kullanıcılar oluşturuluyor..."

# 1. Uygulama veritabanını oluştur
# Not: Eğer POSTGRES_DB değişkeni .env'de uygulamanın veritabanı adıyla aynıysa,
# postgres imajı bu veritabanını varsayılan ayarlarla bizden önce oluşturur.
# O yüzden biz DB_NAME kullanıyoruz. Güvenlik için 'postgres' db'sine bağlanıyoruz.

DB_TO_CREATE=${DB_NAME:-timesheet_management_db}

if psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_TO_CREATE}'" | grep -q 1; then
  echo "[postgres-init] Veritabanı ${DB_TO_CREATE} zaten mevcut, oluşturma atlanıyor."
else
  echo "[postgres-init] Veritabanı ${DB_TO_CREATE} ICU tr-TR ayarlarıyla oluşturuluyor..."
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${DB_TO_CREATE}\" WITH ENCODING 'UTF8' LOCALE_PROVIDER = icu ICU_LOCALE = 'tr-TR' TEMPLATE = template0;"
fi

# 2. uuid-ossp eklentisini kur
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "${DB_TO_CREATE}" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# 3. migration_user oluştur / şifresini güncelle
if psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_MIGRATION_USER}'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "ALTER USER \"${DB_MIGRATION_USER}\" WITH PASSWORD '${DB_MIGRATION_PASSWORD}';"
else
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE USER \"${DB_MIGRATION_USER}\" WITH PASSWORD '${DB_MIGRATION_PASSWORD}';"
fi

# 4. app_user oluştur / şifresini güncelle
if psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '${DB_APP_USER}'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "ALTER USER \"${DB_APP_USER}\" WITH PASSWORD '${DB_APP_PASSWORD}';"
else
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE USER \"${DB_APP_USER}\" WITH PASSWORD '${DB_APP_PASSWORD}';"
fi

# 5. Veritabanı sahipliğini migration_user'a devret
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "ALTER DATABASE \"${DB_TO_CREATE}\" OWNER TO \"${DB_MIGRATION_USER}\";"

# 6. Gelecekte oluşturulacak tablolar için otomatik izinleri ayarla
# Bu sayede migration_user tablo oluşturduğunda, app_user otomatik olarak yetki alır.
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "${DB_TO_CREATE}" -c "
  ALTER DEFAULT PRIVILEGES FOR ROLE \"${DB_MIGRATION_USER}\" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"${DB_APP_USER}\";
  ALTER DEFAULT PRIVILEGES FOR ROLE \"${DB_MIGRATION_USER}\" GRANT USAGE, SELECT ON SEQUENCES TO \"${DB_APP_USER}\";
"

echo "[postgres-init] İşlem başarıyla tamamlandı."
