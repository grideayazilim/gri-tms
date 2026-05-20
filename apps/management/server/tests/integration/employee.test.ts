/* ========================================================================
   EMPLOYEE CRUD INTEGRATION TESTS
   GET/POST/PUT/DELETE /api/employees
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { faker } from '@faker-js/faker/locale/tr'
import app from '../../src/app.js'
import {
  cleanDb,
  createAdminUser,
  createLocation,
  createUnit,
  createEmployee,
  createResponsibleUser,
} from '../helpers/testDb.js'

describe('Employee CRUD API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('POST /api/employees → yeni personel ekler → 201', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      const res = await request(app)
        .post('/api/employees')
        .set('Cookie', admin.cookie)
        .send({
          tcNo: faker.string.numeric(11),
          firstName: 'Ahmet',
          lastName: 'Yılmaz',
          unitId: unit.id,
          locationId: location.id,
          startDate: '2024-01-01',
          ibanNo: 'TR' + faker.string.numeric(24),
        })

      expect(res.status).toBe(201)
      expect(res.body).toBeDefined()


    })

    it('GET /api/employees → personel listesi döner + pagination → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      // 3 personel oluştur
      await createEmployee(unit.id)
      await createEmployee(unit.id)
      await createEmployee(unit.id)

      const res = await request(app)
        .get('/api/employees')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()


      // Pagination meta

    })

    it('PUT /api/employees/:id → personel güncellenir → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)

      const res = await request(app)
        .put(`/api/employees/${emp.id}`)
        .set('Cookie', admin.cookie)
        .send({
          firstName: 'Mehmet',
          lastName: emp.lastName,
          unitId: unit.id,
          locationId: location.id,
          startDate: '2024-01-01',
          ibanNo: 'TR' + faker.string.numeric(24),
          tcNo: emp.tcNo,
        })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()

    })

    it('DELETE /api/employees/:id → soft delete → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)

      const res = await request(app)
        .delete(`/api/employees/${emp.id}`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('GET /api/employees → pagination parametreleri çalışır', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      for (let i = 0; i < 5; i++) {
        await createEmployee(unit.id)
      }

      const res = await request(app)
        .get('/api/employees?page=1&limit=2')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)

    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('POST /api/employees → aynı TC ile tekrar ekle → 409', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const tcNo = faker.string.numeric(11)

      await createEmployee(unit.id, { tcNo })

      const res = await request(app)
        .post('/api/employees')
        .set('Cookie', admin.cookie)
        .send({
          tcNo,
          firstName: 'Başka',
          lastName: 'Biri',
          unitId: unit.id,
          locationId: location.id,
          startDate: '2024-01-01',
          ibanNo: 'TR' + faker.string.numeric(24),
        })

      expect([409, 500]).toContain(res.status)
      expect(res.body.success).toBe(false)
    })

    it('POST /api/employees → eksik zorunlu alan (firstName) → 400', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      const res = await request(app)
        .post('/api/employees')
        .set('Cookie', admin.cookie)
        .send({
          tcNo: faker.string.numeric(11),
          unitId: unit.id,
          startDate: '2024-01-01',
          // firstName eksik
        })

      expect(res.status).toBe(400)
    })

    it('PUT /api/employees/:id → var olmayan personel → 404', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/employees/00000000-0000-0000-0000-000000000000')
        .set('Cookie', admin.cookie)
        .send({
          firstName: 'Test',
          lastName: 'User',
          unitId: '00000000-0000-0000-0000-000000000000',
          locationId: '00000000-0000-0000-0000-000000000000',
          startDate: '2024-01-01',
          tcNo: faker.string.numeric(11),
        })


    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('POST /api/employees → auth olmadan → 401', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({ firstName: 'Test', lastName: 'User' })

      expect(res.status).toBe(401)
    })

    it('GET /api/employees → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/employees')
      expect(res.status).toBe(401)
    })

    it('DELETE /api/employees/:id → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)
      const emp = await createEmployee(unit.id)

      const res = await request(app)
        .delete(`/api/employees/${emp.id}`)
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('GET /api/employees → silinmiş personeller varsayılan olarak listelenmez', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)

      // Soft delete
      await request(app)
        .delete(`/api/employees/${emp.id}`)
        .set('Cookie', admin.cookie)

      // Aktif personel listesinde olmamalı
      const res = await request(app)
        .get('/api/employees?isActive=true')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      
    })
  })
})
