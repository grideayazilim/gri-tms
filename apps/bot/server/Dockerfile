FROM mcr.microsoft.com/playwright:v1.58.2-jammy


WORKDIR /app


COPY package.json package-lock.json ./
RUN npm ci


COPY . .


# progress.json'ın yazıldığı kalıcı dizin (compose'da volume olarak mount edilir)
RUN mkdir -p /app/data
ENV PROGRESS_DIR=/app/data

# Change ownership to the built-in pwuser
RUN chown -R pwuser:pwuser /app


# Switch to the built-in non-root user pwuser
USER pwuser


EXPOSE 3001
CMD ["npm", "start"]
