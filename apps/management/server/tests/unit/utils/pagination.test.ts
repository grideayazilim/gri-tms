import { describe, it, expect } from 'vitest'
import { buildPagination, paginationParams } from '../../../src/utils/pagination.js'

describe('paginationParams', () => {
  it('varsayılan değerler: page=1, limit=10, offset=0', () => {
    const result = paginationParams({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
    expect(result.offset).toBe(0)
  })

  it('geçerli page ve limit değerlerini döner', () => {
    const result = paginationParams({ page: 3, limit: 20 })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(20)
    expect(result.offset).toBe(40)
  })

  it('string değerleri sayıya çevirir', () => {
    const result = paginationParams({ page: '2', limit: '15' })
    expect(result.page).toBe(2)
    expect(result.limit).toBe(15)
    expect(result.offset).toBe(15)
  })

  it('page=0 → 1\'e yükselir', () => {
    const result = paginationParams({ page: 0 })
    expect(result.page).toBe(1)
  })

  it('negatif page → 1\'e yükselir', () => {
    const result = paginationParams({ page: -5 })
    expect(result.page).toBe(1)
  })

  it('limit 100\'ü aşarsa 100\'e indirilir', () => {
    const result = paginationParams({ limit: 999 })
    expect(result.limit).toBe(100)
  })

  it('limit=0 → varsayılan 10 kullanılır (falsy fallback)', () => {
    const result = paginationParams({ limit: 0 })
    expect(result.limit).toBe(10)
  })

  it('negatif limit → 1\'e yükselir', () => {
    const result = paginationParams({ limit: -10 })
    expect(result.limit).toBe(1)
  })

  it('offset doğru hesaplanır: (page-1) * limit', () => {
    const result = paginationParams({ page: 5, limit: 25 })
    expect(result.offset).toBe(100)
  })
})

describe('buildPagination', () => {
  it('doğru meta bilgisi döner', () => {
    const result = buildPagination(2, 10, 55)
    expect(result.currentPage).toBe(2)
    expect(result.limit).toBe(10)
    expect(result.totalRecords).toBe(55)
    expect(result.totalPages).toBe(6)
  })

  it('toplam kayıt 0 ise totalPages 0 döner', () => {
    const result = buildPagination(1, 10, 0)
    expect(result.totalPages).toBe(0)
  })

  it('kayıt sayısı limit\'e tam bölünüyorsa yuvarlama olmaz', () => {
    const result = buildPagination(1, 10, 30)
    expect(result.totalPages).toBe(3)
  })

  it('son sayfada eksik kayıt varsa yukarı yuvarlar', () => {
    const result = buildPagination(1, 10, 31)
    expect(result.totalPages).toBe(4)
  })

  it('tek kayıt için totalPages=1', () => {
    const result = buildPagination(1, 10, 1)
    expect(result.totalPages).toBe(1)
  })
})
