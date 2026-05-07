# ─── Stage 1: Build React ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Sadece client dosyalarını kopyala
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Nginx ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Build çıktısını nginx web root'una kopyala
COPY --from=builder /app/build /usr/share/nginx/html

# Özel Nginx konfigürasyonu (opsiyonel ama react router için faydalı)
# RUN rm /etc/nginx/conf.d/default.conf
# COPY nginx.conf /etc/nginx/conf.d

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
