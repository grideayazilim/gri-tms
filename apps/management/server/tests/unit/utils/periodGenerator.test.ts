import { vi, describe, it, expect, beforeEach } from 'vitest'

const { mockDeletePeriodsOutside, mockUpsertPeriod } = vi.hoisted(() => ({
  mockDeletePeriodsOutside: vi.fn().mockResolvedValue(undefined),
  mockUpsertPeriod: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/repositories/settingsRepo.js', () => ({
  settingsRepo: {
    deletePeriodsOutside: mockDeletePeriodsOutside,
    upsertPeriod: mockUpsertPeriod,
  },
}))

import { regeneratePeriodsForRange } from '../../../src/utils/periodGenerator.js'
import { createMockDb } from '../../helpers/mockDb.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockDeletePeriodsOutside.mockResolvedValue(undefined)
  mockUpsertPeriod.mockResolvedValue(undefined)
})

describe('regeneratePeriodsForRange', () => {
  it('aralık dışı dönemleri siler', async () => {
    const { executor } = createMockDb()
    await regeneratePeriodsForRange(executor as never, '2024-01-01', '2024-03-31')
    expect(mockDeletePeriodsOutside).toHaveBeenCalledWith(executor, '2024-01-01', '2024-03-31')
  })

  it('3 aylık aralık için 3 dönem oluşturur', async () => {
    const { executor } = createMockDb()
    await regeneratePeriodsForRange(executor as never, '2024-01-01', '2024-03-31')
    expect(mockUpsertPeriod).toHaveBeenCalledTimes(3)
  })

  it('tek ay aralığı için 1 dönem oluşturur', async () => {
    const { executor } = createMockDb()
    await regeneratePeriodsForRange(executor as never, '2024-06-01', '2024-06-30')
    expect(mockUpsertPeriod).toHaveBeenCalledTimes(1)
  })

  it('geçersiz tarih aralığında deletePeriodsOutside çağrılır ama upsert çağrılmaz', async () => {
    const { executor } = createMockDb()
    await regeneratePeriodsForRange(executor as never, 'invalid', 'invalid')
    expect(mockDeletePeriodsOutside).toHaveBeenCalledOnce()
    expect(mockUpsertPeriod).not.toHaveBeenCalled()
  })

  it('başlangıç ayı için program başlangıç tarihini startDate olarak kullanır', async () => {
    const { executor } = createMockDb()
    await regeneratePeriodsForRange(executor as never, '2024-01-15', '2024-02-28')
    const firstCall = mockUpsertPeriod.mock.calls[0]?.[1]
    expect(firstCall?.startDate).toBe('2024-01-15')
  })

  it('bitiş ayı için program bitiş tarihini endDate olarak kullanır', async () => {
    const { executor } = createMockDb()
    await regeneratePeriodsForRange(executor as never, '2024-01-01', '2024-02-15')
    const secondCall = mockUpsertPeriod.mock.calls[1]?.[1]
    expect(secondCall?.endDate).toBe('2024-02-15')
  })

  it('yıl geçişinde dönemler doğru oluşturulur (Ekim 2024 - Şubat 2025)', async () => {
    const { executor } = createMockDb()
    await regeneratePeriodsForRange(executor as never, '2024-10-01', '2025-02-28')
    expect(mockUpsertPeriod).toHaveBeenCalledTimes(5)
  })
})
