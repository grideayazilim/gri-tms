# ─── Stage 1: Build React ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Workspace manifest'leri kopyala
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci

COPY shared/ ./shared/
COPY client/ ./client/

RUN npm run build -w @timesheet/shared

# VITE_API_URL: production'da nginx proxy üzerinden göreli /api yolunu kullan
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w client

# ─── Stage 2: Nginx ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Build çıktısını nginx web root'una kopyala
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Nginx konfigürasyonu (API proxy dahil)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
