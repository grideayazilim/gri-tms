import { describe, it, expect } from 'vitest'
import { importEmployeeSchema, importFinalizeSchema, bulkImportEmployeesSchema, bulkImportEnvelopeSchema, bulkImportEmployeeSchema } from '../../src/schemas/import.schema.js'

describe('importEmployeeSchema', () => {
  const validImport = {
    tcNo: '12345678901',
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    locationId: 'loc-1',
    year: 2024,
    month: 6,
  }

  it('geçerli veri ile başarılı olur', () => {
    const result = importEmployeeSchema.safeParse(validImport)
    expect(result.success).toBe(true)
  })

  it('TC No 11 hane değilse reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, tcNo: '1234' })
    expect(result.success).toBe(false)
  })

  it('TC No harf içerirse reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, tcNo: '1234567890a' })
    expect(result.success).toBe(false)
  })

  it('geçerli IBAN ile başarılı olur', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, ibanNo: 'TR' + '1'.repeat(24) })
    expect(result.success).toBe(true)
  })

  it('geçersiz IBAN reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, ibanNo: 'DE123' })
    expect(result.success).toBe(false)
  })

  it('ay 13 ise reddeder', () => {
    const result = importEmployeeSchema.safeParse({ ...validImport, month: 13 })
    expect(result.success).toBe(false)
  })

  it('markers record opsiyonel', () => {
    const result = importEmployeeSchema.safeParse({
      ...validImport,
      markers: { '2024-06-01': 'X', '2024-06-02': 'R' },
    })
    expect(result.success).toBe(true)
  })
})

describe('importFinalizeSchema', () => {
  const valid = {
    locationName: 'Merkez Yerleşke',
    year: 2024,
    month: 6,
  }

  it('geçerli veri ile başarılı olur', () => {
    const result = importFinalizeSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('boş locationName reddeder', () => {
    const result = importFinalizeSchema.safeParse({ ...valid, locationName: '' })
    expect(result.success).toBe(false)
  })

  it('timesheetChanges varsayılan boş dizi', () => {
    const result = importFinalizeSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.timesheetChanges).toEqual([])
  })

  it('geçerli timesheetChanges ile başarılı olur', () => {
    const result = importFinalizeSchema.safeParse({
      ...valid,
      timesheetChanges: [{ name: 'Ahmet Yılmaz', daysCount: 20 }],
    })
    expect(result.success).toBe(true)
  })
})

describe('bulkImportEmployeesSchema', () => {
  it('geçerli toplu veri ile başarılı olur', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{ tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez' }],
    })
    expect(result.success).toBe(true)
  })

  // Boş dizi artık reddedilir — anlamsız istek DB'ye gitmesin
  it('boş employees dizisi reddeder', () => {
    const result = bulkImportEmployeesSchema.safeParse({ employees: [] })
    expect(result.success).toBe(false)
  })

  it('tcNo eksikse reddeder', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{ fullName: 'Ahmet', locationName: 'Merkez' }],
    })
    expect(result.success).toBe(false)
  })

  // 500 kayıt üst sınırı
  it('500 kayıttan fazlasını reddeder', () => {
    const employees = Array.from({ length: 501 }, (_, i) => ({
      tcNo: String(10000000000 + i),
      fullName: 'Ahmet Yılmaz',
      locationName: 'Merkez',
    }))
    const result = bulkImportEmployeesSchema.safeParse({ employees })
    expect(result.success).toBe(false)
  })

  // Bozuk tarih Zod'da yakalanır; Postgres'e ulaşsa tüm transaction'ı ABORT ederdi
  it('YYYY-MM-DD formatında olmayan startDate reddeder', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{ tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez', startDate: '01.02.2026' }],
    })
    expect(result.success).toBe(false)
  })

  it('geçerli ISO tarihleri kabul eder', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{
        tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez',
        startDate: '2026-02-01', endDate: '2026-06-30',
      }],
    })
    expect(result.success).toBe(true)
  })

  // end_date < start_date DB'de 23514 check violation üretiyordu
  it('çıkış tarihi giriş tarihinden önceyse reddeder', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{
        tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez',
        startDate: '2026-06-30', endDate: '2026-02-01',
      }],
    })
    expect(result.success).toBe(false)
  })

  it('geçersiz IBAN formatını reddeder', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{ tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez', ibanNo: 'TR123' }],
    })
    expect(result.success).toBe(false)
  })

  it('11 haneli olmayan tcNo reddeder', () => {
    const result = bulkImportEmployeesSchema.safeParse({
      employees: [{ tcNo: '123', fullName: 'Ahmet Yılmaz', locationName: 'Merkez' }],
    })
    expect(result.success).toBe(false)
  })
})

/* Zarf şeması yalnızca dizi sınırlarını (1-500 satır) kontrol eder. Satır
   doğrulaması controller'da satır bazlı yapılır ve hatalı satır rapora yazılır;
   böylece tek geçersiz satır tüm dosyayı reddettirmez. */
describe('bulkImportEnvelopeSchema', () => {
  it('boş employees dizisi reddedilir', () => {
    const result = bulkImportEnvelopeSchema.safeParse({ employees: [] })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('En az bir çalışan')
  })

  it('500 kayıttan fazlası reddedilir', () => {
    const employees = Array.from({ length: 501 }, () => ({}))
    const result = bulkImportEnvelopeSchema.safeParse({ employees })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('en fazla 500')
  })

  it('500 kayıt tam sınırda geçer', () => {
    const employees = Array.from({ length: 500 }, () => ({}))
    expect(bulkImportEnvelopeSchema.safeParse({ employees }).success).toBe(true)
  })

  it('employees alanı yoksa reddedilir', () => {
    expect(bulkImportEnvelopeSchema.safeParse({}).success).toBe(false)
  })

  it('HATALI satır zarfı GEÇER — satır doğrulaması controller\'da yapılır', () => {
    const result = bulkImportEnvelopeSchema.safeParse({
      employees: [
        { tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez' },
        { tcNo: 'GECERSIZ', fullName: 'Mehmet Demir', locationName: 'Merkez' },
      ],
    })
    expect(result.success).toBe(true)

    // Aynı veri eski (tüm diziyi doğrulayan) şemada tümüyle reddediliyordu
    expect(bulkImportEmployeesSchema.safeParse({
      employees: [
        { tcNo: '12345678901', fullName: 'Ahmet Yılmaz', locationName: 'Merkez' },
        { tcNo: 'GECERSIZ', fullName: 'Mehmet Demir', locationName: 'Merkez' },
      ],
    }).success).toBe(false)
  })

  it('satır şeması hatalı TC için anlamlı mesaj üretir (rapora yazılan metin)', () => {
    const result = bulkImportEmployeeSchema.safeParse({
      tcNo: 'GECERSIZ', fullName: 'Ahmet Yılmaz', locationName: 'Merkez',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toBe('TC No 11 haneli rakam olmalıdır')
  })
})
