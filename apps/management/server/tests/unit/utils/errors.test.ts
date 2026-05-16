import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '../../../src/utils/errors.js'

describe('getErrorMessage', () => {
  it('Error instance\'ından mesajı alır', () => {
    const err = new Error('Bağlantı hatası')
    expect(getErrorMessage(err, 'fallback')).toBe('Bağlantı hatası')
  })

  it('message özelliği olan objeden mesajı alır', () => {
    const err = { message: 'Özel hata mesajı' }
    expect(getErrorMessage(err, 'fallback')).toBe('Özel hata mesajı')
  })

  it('number message olan objeden mesajı string\'e çevirir', () => {
    const err = { message: 42 }
    expect(getErrorMessage(err, 'fallback')).toBe('42')
  })

  it('message alanı olmayan objede fallback döner', () => {
    const err = { code: 500 }
    expect(getErrorMessage(err, 'Bilinmeyen hata')).toBe('Bilinmeyen hata')
  })

  it('string değeri için fallback döner (string instance değil)', () => {
    expect(getErrorMessage('düz hata', 'fallback')).toBe('fallback')
  })

  it('null için fallback döner', () => {
    expect(getErrorMessage(null, 'null hatası')).toBe('null hatası')
  })

  it('undefined için fallback döner', () => {
    expect(getErrorMessage(undefined, 'undefined hatası')).toBe('undefined hatası')
  })

  it('0 sayısı için fallback döner', () => {
    expect(getErrorMessage(0, 'sıfır')).toBe('sıfır')
  })
})
