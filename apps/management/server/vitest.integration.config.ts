import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // .env.test dosyasını oku (integration testler gerçek DB kullanır)
  const env = loadEnv(mode, __dirname, '')

  return {
    test: {
      environment: 'node',
      globals: false,
      include: ['tests/integration/**/*.test.ts'],
      setupFiles: ['tests/integration/setup.ts'],
      // Her test dosyası sıralı çalışsın (DB yarış koşullarından kaçınmak için)
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      testTimeout: 30000,
      hookTimeout: 30000,
      env: {
        ...env,
        NODE_ENV: 'test',
        DB_HOST: env['DB_HOST'] ?? 'localhost',
        DB_PORT: env['DB_PORT'] ?? '5432',
        DB_NAME: env['DB_NAME'] ?? 'timesheet_management_db',
        DB_APP_USER: env['DB_APP_USER'] ?? 'migration_user',
        DB_APP_PASSWORD: env['DB_APP_PASSWORD'] ?? 'test_migration_password',
        ACCESS_TOKEN_SECRET: env['ACCESS_TOKEN_SECRET'] ?? 'integration-test-access-secret-min32',
        REFRESH_TOKEN_SECRET: env['REFRESH_TOKEN_SECRET'] ?? 'integration-test-refresh-secret-min3',
        COOKIE_SECURE: 'false',
        FRONTEND_URL: 'http://localhost:5173',
      },
    },
    resolve: {
      alias: {
        '@timesheet/shared': path.resolve(__dirname, '../shared/src/index.ts'),
      },
    },
  }
})
