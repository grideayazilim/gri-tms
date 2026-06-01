FROM mcr.microsoft.com/playwright:v1.58.2-jammy


WORKDIR /app


COPY package.json package-lock.json ./
RUN npm ci


COPY . .


# Change ownership to the built-in pwuser
RUN chown -R pwuser:pwuser /app


# Switch to the built-in non-root user pwuser
USER pwuser


EXPOSE 3001
CMD ["npm", "start"]
