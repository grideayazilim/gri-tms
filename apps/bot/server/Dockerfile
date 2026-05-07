FROM mcr.microsoft.com/playwright:jammy

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3001
CMD ["npm", "start"]
