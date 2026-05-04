# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Workspace manifest'leri kopyala (layer cache için kaynak koddan önce)
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Tüm workspace bağımlılıklarını yükle
RUN npm ci

# Kaynak kodları kopyala ve derle
COPY shared/ ./shared/
COPY server/ ./server/

RUN npm run build -w @timesheet/shared
RUN npm run build -w server

# Workspace symlink'ini (node_modules/@timesheet/shared → ../../shared) gerçek
# içerikle değiştir; COPY ile çalışan katmanlar broken symlink görmez.
RUN rm -rf node_modules/@timesheet/shared \
    && cp -r shared node_modules/@timesheet/shared

# Dev bağımlılıklarını kaldır (image boyutunu küçültmek için)
RUN npm prune --omit=dev

# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# pg_isready: DB hazır olana kadar beklemek için
RUN apk add --no-cache postgresql-client

ENV NODE_ENV=production

# Hoisted production deps (includes resolved @timesheet/shared)
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules

# Server uygulama dosyaları
WORKDIR /app/server
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/database/migrations ./database/migrations

COPY server/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
