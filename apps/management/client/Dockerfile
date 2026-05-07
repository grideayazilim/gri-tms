# ─── Stage 1: Build React ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Workspace manifest'leri kopyala
COPY package.json package-lock.json ./
COPY apps/management/shared/package.json ./apps/management/shared/
COPY apps/management/client/package.json ./apps/management/client/
COPY apps/management/server/package.json ./apps/management/server/

RUN npm ci

COPY apps/management/shared/ ./apps/management/shared/
COPY apps/management/client/ ./apps/management/client/

RUN npm run build -w @timesheet/shared

# VITE_API_URL: production'da nginx proxy üzerinden göreli /api yolunu kullan
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w management-client

# ─── Stage 2: Nginx ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Build çıktısını nginx web root'una kopyala
COPY --from=builder /app/apps/management/client/dist /usr/share/nginx/html

# Nginx konfigürasyonu (API proxy dahil)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
