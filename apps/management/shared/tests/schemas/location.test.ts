import { describe, it, expect } from 'vitest'
import { locationSchema, unitSchema, syncLocationSchema } from '../../src/schemas/location.schema.js'

describe('locationSchema', () => {
  it('geçerli yerleşke ile başarılı olur', () => {
    const result = locationSchema.safeParse({ name: 'Merkez Kampüs', programNo: 'MRZ001' })
    expect(result.success).toBe(true)
  })

  it('boş ad reddeder', () => {
    const result = locationSchema.safeParse({ name: '', programNo: 'MRZ001' })
    expect(result.success).toBe(false)
  })

  it('boş programNo reddeder', () => {
    const result = locationSchema.safeParse({ name: 'Merkez', programNo: '' })
    expect(result.success).toBe(false)
  })

  it('ad trim edilir', () => {
    const result = locationSchema.safeParse({ name: '  Merkez  ', programNo: 'MRZ001' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('MERKEZ')
  })

  it('eksik alanlar ile reddeder', () => {
    const result = locationSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('unitSchema', () => {
  it('geçerli birim ile başarılı olur', () => {
    const result = unitSchema.safeParse({ locationId: 'loc-1', name: 'Bilgi İşlem' })
    expect(result.success).toBe(true)
  })

  it('boş locationId reddeder', () => {
    const result = unitSchema.safeParse({ locationId: '', name: 'Bilgi İşlem' })
    expect(result.success).toBe(false)
  })

  it('boş birim adı reddeder', () => {
    const result = unitSchema.safeParse({ locationId: 'loc-1', name: '' })
    expect(result.success).toBe(false)
  })

  it('birim adı trim edilir', () => {
    const result = unitSchema.safeParse({ locationId: 'loc-1', name: '  Bilgi İşlem  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('BİLGİ İŞLEM')
  })
})

describe('syncLocationSchema', () => {
  const validSync = {
    name: 'Merkez',
    programNo: 'MRZ001',
    units: [{ name: 'Bilgi İşlem' }],
  }

  it('geçerli senkronizasyon verisi ile başarılı olur', () => {
    const result = syncLocationSchema.safeParse(validSync)
    expect(result.success).toBe(true)
  })

  it('boş units dizisi kabul edilir', () => {
    const result = syncLocationSchema.safeParse({ ...validSync, units: [] })
    expect(result.success).toBe(true)
  })

  it('birim adı boşsa reddeder', () => {
    const result = syncLocationSchema.safeParse({ ...validSync, units: [{ name: '' }] })
    expect(result.success).toBe(false)
  })

  it('birim id opsiyoneldir', () => {
    const result = syncLocationSchema.safeParse({
      ...validSync,
      units: [{ id: 'some-uuid', name: 'Birim' }],
    })
    expect(result.success).toBe(true)
  })

  it('boş programNo reddeder', () => {
    const result = syncLocationSchema.safeParse({ ...validSync, programNo: '' })
    expect(result.success).toBe(false)
  })
})
