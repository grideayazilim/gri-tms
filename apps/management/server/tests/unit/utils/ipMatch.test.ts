import { describe, it, expect } from 'vitest'
import { parseIpAllowlist, isIpAllowlisted } from '../../../src/utils/ipMatch.js'

/* IP başına giriş sayacı, okuldaki tüm bilgisayarlar tek dış IP'nin
   arkasında olduğu için tek bir kullanıcının hatalı denemeleriyle herkesi
   kilitleyebiliyordu. İç ağ aralıkları YALNIZCA IP sayacından muaf tutulabilsin
   diye bağımlılıksız bir IPv4 CIDR eşleştirici eklendi. */
describe('parseIpAllowlist / isIpAllowlisted', () => {
  const list = parseIpAllowlist('10.0.0.0/8, 192.168.1.0/24 ,203.0.113.7, ::1')

  it('CIDR aralığındaki adresi eşleştirir', () => {
    expect(isIpAllowlisted('10.5.4.3', list)).toBe(true)
    expect(isIpAllowlisted('10.255.255.255', list)).toBe(true)
    expect(isIpAllowlisted('192.168.1.7', list)).toBe(true)
  })

  it('aralık dışındaki adresi eşleştirmez', () => {
    expect(isIpAllowlisted('11.0.0.1', list)).toBe(false)
    expect(isIpAllowlisted('192.168.2.7', list)).toBe(false)
  })

  it('maskesiz tek IP tam eşleşme ister', () => {
    expect(isIpAllowlisted('203.0.113.7', list)).toBe(true)
    expect(isIpAllowlisted('203.0.113.8', list)).toBe(false)
  })

  it('IPv4-mapped IPv6 adresini (::ffff:) çözer', () => {
    // trust proxy altında Node bazı ortamlarda bu biçimi verir
    expect(isIpAllowlisted('::ffff:10.1.2.3', list)).toBe(true)
    expect(isIpAllowlisted('::ffff:11.1.2.3', list)).toBe(false)
  })

  it('IPv6 girdisinde tam metin eşleşmesi arar', () => {
    expect(isIpAllowlisted('::1', list)).toBe(true)
    expect(isIpAllowlisted('2001:db8::1', list)).toBe(false)
  })

  it('boş / tanımsız liste hiçbir adresi muaf tutmaz', () => {
    expect(isIpAllowlisted('10.0.0.1', parseIpAllowlist(undefined))).toBe(false)
    expect(isIpAllowlisted('10.0.0.1', parseIpAllowlist(''))).toBe(false)
    expect(isIpAllowlisted('10.0.0.1', parseIpAllowlist('  ,  '))).toBe(false)
  })

  it('IP verilmezse muaf değildir', () => {
    expect(isIpAllowlisted(undefined, list)).toBe(false)
  })

  it('bozuk girdiler sessizce yok sayılır, eşleşme üretmez', () => {
    expect(isIpAllowlisted('bozuk', list)).toBe(false)
    expect(isIpAllowlisted('999.1.1.1', list)).toBe(false)
    expect(isIpAllowlisted('10.0.0.1', parseIpAllowlist('10.0.0.0/33'))).toBe(false)
    expect(isIpAllowlisted('10.0.0.1', parseIpAllowlist('10.0.0.0/-1'))).toBe(false)
  })

  it('/0 tüm IPv4 adreslerini kapsar (32 bit kaydırma tuzağı)', () => {
    const all = parseIpAllowlist('0.0.0.0/0')
    expect(isIpAllowlisted('8.8.8.8', all)).toBe(true)
    expect(isIpAllowlisted('10.0.0.1', all)).toBe(true)
  })

  it('/32 yalnızca tek adresi kapsar', () => {
    const single = parseIpAllowlist('203.0.113.7/32')
    expect(isIpAllowlisted('203.0.113.7', single)).toBe(true)
    expect(isIpAllowlisted('203.0.113.6', single)).toBe(false)
  })
})
