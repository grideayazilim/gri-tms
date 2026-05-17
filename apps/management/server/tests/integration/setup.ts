/* ========================================================================
   INTEGRATION TEST SETUP
   Test DB bağlantısı kurulumu ve global teardown
   ======================================================================== */
import { beforeAll, afterAll } from 'vitest'
import { pool } from '../../src/config/database.js'
import { cleanDb } from '../helpers/testDb.js'

// Tüm integration test suite başlamadan önce DB bağlantısını doğrula
beforeAll(async () => {
  try {
    const client = await pool.connect()
    client.release()
  } catch (err) {
    console.error(
      '❌ Test DB bağlantısı kurulamadı. docker-compose.test.yml ile PostgreSQL başlatın:\n' +
      '   docker compose -f docker-compose.test.yml up -d postgres\n' +
      '   npm run db:migrate -w management-server\n',
      err
    )
    process.exit(1)
  }
})

// Tüm integration testler bittikten sonra pool'u kapat
afterAll(async () => {
  await cleanDb()
  await pool.end()
})
