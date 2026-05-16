import { describe, it, expect } from 'vitest'
import {
  toISODateString,
  parseLocalDate,
  isWeekend,
  formatPeriodLabel,
  getISOWeekKey,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from '../../../src/utils/dateUtils.js'

describe('toISODateString', () => {
  it('Date objesini YYYY-MM-DD formatına çevirir', () => {
    const date = new Date(2024, 0, 15) // Ocak 15
    expect(toISODateString(date)).toBe('2024-01-15')
  })

  it('ISO string\'i YYYY-MM-DD formatına çevirir', () => {
    expect(toISODateString('2024-06-01')).toBe('2024-06-01')
  })

  it('null için null döner', () => {
    expect(toISODateString(null)).toBeNull()
  })

  it('undefined için null döner', () => {
    expect(toISODateString(undefined)).toBeNull()
  })

  it('geçersiz tarih için null döner', () => {
    expect(toISODateString('not-a-date')).toBeNull()
  })

  it('yıl geçişinde doğru çalışır (31 Aralık 2023)', () => {
    const date = new Date(2023, 11, 31)
    expect(toISODateString(date)).toBe('2023-12-31')
  })
})

describe('parseLocalDate', () => {
  it('YYYY-MM-DD stringini timezone kayması olmadan parse eder', () => {
    const result = parseLocalDate('2024-01-15')
    expect(result).not.toBeNull()
    expect(result?.getFullYear()).toBe(2024)
    expect(result?.getMonth()).toBe(0) // Ocak = 0
    expect(result?.getDate()).toBe(15)
  })

  it('Date objesini temiz Date olarak döner', () => {
    const input = new Date(2024, 5, 1, 12, 0, 0) // saat bilgisi var
    const result = parseLocalDate(input)
    expect(result?.getHours()).toBe(0)
    expect(result?.getDate()).toBe(1)
  })

  it('null için null döner', () => {
    expect(parseLocalDate(null)).toBeNull()
  })

  it('undefined için null döner', () => {
    expect(parseLocalDate(undefined)).toBeNull()
  })

  it('eksik parçalı string için null döner', () => {
    expect(parseLocalDate('2024-01')).toBeNull()
  })

  it('şubat 29 artık yılda parse edilir', () => {
    const result = parseLocalDate('2024-02-29')
    expect(result).not.toBeNull()
    expect(result?.getDate()).toBe(29)
  })

  it('geçersiz Date objesi için null döner', () => {
    const invalid = new Date('not-a-date')
    expect(parseLocalDate(invalid)).toBeNull()
  })
})

describe('isWeekend', () => {
  it('Cumartesi için true döner', () => {
    const sat = new Date(2024, 0, 6) // 6 Ocak 2024 Cumartesi
    expect(isWeekend(sat)).toBe(true)
  })

  it('Pazar için true döner', () => {
    const sun = new Date(2024, 0, 7)
    expect(isWeekend(sun)).toBe(true)
  })

  it('Pazartesi için false döner', () => {
    const mon = new Date(2024, 0, 8)
    expect(isWeekend(mon)).toBe(false)
  })

  it('Cuma için false döner', () => {
    const fri = new Date(2024, 0, 5)
    expect(isWeekend(fri)).toBe(false)
  })
})

describe('formatPeriodLabel', () => {
  it('ay tek haneli ise sıfır doldurur', () => {
    expect(formatPeriodLabel(2024, 1)).toBe('2024-01')
    expect(formatPeriodLabel(2024, 9)).toBe('2024-09')
  })

  it('iki haneli ay doğru formatlar', () => {
    expect(formatPeriodLabel(2024, 12)).toBe('2024-12')
  })
})

describe('getISOWeekKey', () => {
  it('Ocak 1 2024 için doğru hafta anahtarı döner', () => {
    const date = new Date(2024, 0, 1)
    const key = getISOWeekKey(date)
    expect(key).toMatch(/^\d{4}-W\d{2}$/)
  })

  it('yıl geçişinde ISO hafta yılını doğru kullanır (2024-12-30 → W01 2025)', () => {
    const date = new Date(2024, 11, 30)
    const key = getISOWeekKey(date)
    expect(key).toBe('2025-W01')
  })
})

describe('eachDayOfInterval ve startOfMonth/endOfMonth', () => {
  it('Ocak ayı için 31 gün döner', () => {
    const start = new Date(2024, 0, 1)
    const end = new Date(2024, 0, 31)
    const days = eachDayOfInterval({ start, end })
    expect(days.length).toBe(31)
  })

  it('Şubat 2024 (artık yıl) için 29 gün döner', () => {
    const start = startOfMonth(new Date(2024, 1, 1))
    const end = endOfMonth(new Date(2024, 1, 1))
    const days = eachDayOfInterval({ start, end })
    expect(days.length).toBe(29)
  })
})
