import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: [
      'tests/unit/**/*.test.ts',
      '../shared/tests/**/*.test.ts',
    ],
    setupFiles: ['tests/setup.ts'],
    env: {
      ACCESS_TOKEN_SECRET: 'test-access-secret-min32chars-padding',
      REFRESH_TOKEN_SECRET: 'test-refresh-secret-min32chars-pad',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/utils/**',
        'src/middlewares/**',
        '../shared/src/schemas/**',
      ],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        'src/jobs/cronJobs.ts',
        'src/utils/logger.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@timesheet/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
})
