/* ========================================================================
   SAĞLIK KONTROLÜ TESTLERİ

   /api/health readiness'tır: veritabanına dokunur ve erişilemezse 503 döner.
   Koşulsuz {status:'ok'} dönseydi bağlantı koptuğunda Docker healthcheck
   geçmeye devam eder, `restart: always` devreye girmez ve sistem "sağlıklı ama
   kullanılamaz" kalırdı.

   Veritabanı erişimi `db.execute` mock'lanarak taklit edilir; bu testler gerçek
   bir veritabanı gerektirmez.
   ======================================================================== */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'

const execute = vi.fn()

vi.mock('../../../src/config/database.js', () => ({
  db: { execute, transaction: vi.fn() },
  pool: { connect: vi.fn(), end: vi.fn(), on: vi.fn() },
  withDrizzleTransaction: vi.fn(),
}))

const { default: app } = await import('../../../src/app.js')

beforeEach(() => {
  execute.mockReset()
})

describe('GET /api/health — hazır olma (readiness)', () => {
  it('veritabanı erişilebilirken 200 ve db:up döner', async () => {
    execute.mockResolvedValue({ rows: [{ '?column?': 1 }] })

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', db: 'up' })
    expect(execute).toHaveBeenCalledOnce()
  })

  it('veritabanına erişilemezken 503 ve db:down döner', async () => {
    execute.mockRejectedValue(new Error('terminating connection due to administrator command'))

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ status: 'error', db: 'down' })
  })

  it('veritabanı yanıt vermiyorsa (asılı sorgu) 503 döner', async () => {
    // Havuz takıldığında sorgu hiç dönmez — 3 saniyelik timeout devreye girmeli
    execute.mockImplementation(() => new Promise(() => { /* asılı kalır */ }))

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body.db).toBe('down')
  }, 10000)
})

describe('GET /api/health/live — canlılık (liveness)', () => {
  it('veritabanına HİÇ dokunmadan 200 döner', async () => {
    execute.mockRejectedValue(new Error('DB kapalı'))

    const res = await request(app).get('/api/health/live')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
    expect(execute).not.toHaveBeenCalled()
  })
})
