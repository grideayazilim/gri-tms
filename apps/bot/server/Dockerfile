FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Root yerine kısıtlı kullanıcıyla çalıştır — container privilege escalation önlemi
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

EXPOSE 3001
CMD ["npm", "start"]
