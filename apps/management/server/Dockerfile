# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Workspace manifest'leri kopyala (layer cache için kaynak koddan önce)
# Root package.json tüm workspace'leri (management/* + bot/*) tanımladığından
# bot/* package.json'ları da kopyalanmalı; aksi halde npm install eksik workspace üyesi hatası verir.
COPY package.json package-lock.json ./
COPY apps/management/shared/package.json ./apps/management/shared/
COPY apps/management/server/package.json ./apps/management/server/
COPY apps/management/client/package.json ./apps/management/client/
COPY apps/bot/server/package.json ./apps/bot/server/
COPY apps/bot/client/package.json ./apps/bot/client/

# Tüm workspace bağımlılıklarını yükle
# Lockfile'ı koruyarak temiz kurulum yapıyoruz (indirmeleri hızlandırır ve ağ hatalarını azaltır)
RUN npm ci

# Kaynak kodları kopyala ve derle
COPY apps/management/shared/ ./apps/management/shared/
COPY apps/management/server/ ./apps/management/server/

RUN npm run build -w @timesheet/shared
RUN npm run build -w management-server

# Dev bağımlılıklarını kaldır (image boyutunu küçültmek için)
RUN npm prune --omit=dev

# Workspace symlink'ini (node_modules/@timesheet/shared → ../../shared) gerçek
# içerikle değiştir; prune'dan sonra yapılmalı — aksi halde prune symlink'i siler.
RUN rm -rf node_modules/@timesheet/shared \
    && cp -r apps/management/shared node_modules/@timesheet/shared

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# pg_isready: DB hazır olana kadar beklemek için
RUN apk add --no-cache postgresql-client

ENV NODE_ENV=production

# Hoisted production deps (includes resolved @timesheet/shared)
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules

# Server uygulama dosyaları
WORKDIR /app/apps/management/server
COPY --from=builder /app/apps/management/server/node_modules ./node_modules
COPY --from=builder /app/apps/management/server/dist ./dist
COPY --from=builder /app/apps/management/server/database/migrations ./database/migrations

COPY apps/management/server/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Root yerine kısıtlı kullanıcıyla çalıştır — container privilege escalation önlemi
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
