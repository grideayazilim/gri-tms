import { describe, it, expect } from 'vitest'

import { generateTimesheetExcel, TEMPLATE_MAX_EMPLOYEES } from '../../../src/utils/excelHandler.js'
import { AppError } from '../../../src/utils/AppError.js'

/* Şablonda her sheet'in hazır satır bloğu ve altında sabit footer var. En dar
   sheet ('banka listesi son') 390 satır taşıyabiliyor. Sınır aşılırsa çalışan
   satırları footer'ın üzerine yazılır ve baskı alanı sabit olduğu için fazla
   satırlar çıktıda görünmez; bu yüzden sessizce üretmek yerine hata verilmeli. */

function makeEmployees(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `emp-${i}`,
    tcNo: String(10000000000 + i),
    firstName: 'AHMET',
    lastName: `YILMAZ${i}`,
    ibanNo: 'TR' + '1'.repeat(24),
    unitId: 'unit-1',
    unitName: 'BİRİM A',
    startDate: '2026-02-01',
    endDate: null,
  }))
}

const baseOptions = {
  daysMap: {},
  dailyWage: 1080.5,
  year: 2026,
  month: 3,
  locationName: 'MERKEZ',
  programNo: '123',
  periodStartDate: '2026-03-01',
  periodEndDate: '2026-03-31',
}

describe('Excel şablon kapasitesi', () => {
  it('sınır sabiti en dar sheet ile uyumlu (banka listesi son)', () => {
    expect(TEMPLATE_MAX_EMPLOYEES).toBe(390)
  })

  it('sınırın üzerinde çalışan varsa hata fırlatır (sessizce bozuk dosya üretmez)', async () => {
    await expect(
      generateTimesheetExcel({ ...baseOptions, employees: makeEmployees(TEMPLATE_MAX_EMPLOYEES + 1) }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('hata mesajı gerçek sayıyı ve sınırı içerir', async () => {
    try {
      await generateTimesheetExcel({ ...baseOptions, employees: makeEmployees(500) })
      throw new Error('hata bekleniyordu')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect((err as AppError).status).toBe(400)
      expect((err as AppError).message).toContain('500')
      expect((err as AppError).message).toContain('390')
    }
  })

  it('sınır değerinde (tam 390) çalışır', async () => {
    const buffer = await generateTimesheetExcel({
      ...baseOptions,
      employees: makeEmployees(TEMPLATE_MAX_EMPLOYEES),
    })
    // xlsx ZIP'tir: "PK\x03\x04" ile başlamalı
    expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  })

  it('normal boyutta çalışmaya devam eder', async () => {
    const buffer = await generateTimesheetExcel({ ...baseOptions, employees: makeEmployees(143) })
    expect(buffer.length).toBeGreaterThan(1000)
  })
})

/* sınır davranışı: 390 tam oturur (gizlenecek satır kalmaz), 391 taşar. */
describe('Excel şablon sınır davranışı', () => {
  it('391 çalışan reddedilir', async () => {
    await expect(
      generateTimesheetExcel({ ...baseOptions, employees: makeEmployees(391) }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('389 çalışan (bir eksik) sorunsuz üretilir', async () => {
    const buffer = await generateTimesheetExcel({ ...baseOptions, employees: makeEmployees(389) })
    expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  })
})
