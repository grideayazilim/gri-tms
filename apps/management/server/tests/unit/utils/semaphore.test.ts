import { describe, it, expect } from 'vitest'

import { createSemaphore } from '../../../src/utils/semaphore.js'

/* Excel üretimi tek event loop'u bloke ediyor. Semafor eşzamanlı ağır
   iş sayısını sınırlar; kuyruk sırası korunmalı ve hata durumunda slot
   serbest bırakılmalıdır. */
describe('createSemaphore', () => {
  it('aynı anda limitten fazla iş çalıştırmaz', async () => {
    const run = createSemaphore(2)
    let active = 0
    let maxActive = 0

    const task = async (): Promise<void> => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 10))
      active--
    }

    await Promise.all(Array.from({ length: 6 }, () => run(task)))

    expect(maxActive).toBe(2)
  })

  it('işin dönüş değerini geçirir', async () => {
    const run = createSemaphore(1)
    const result = await run(async () => 42)
    expect(result).toBe(42)
  })

  it('hata fırlatan iş slotu serbest bırakır', async () => {
    const run = createSemaphore(1)

    await expect(run(async () => { throw new Error('patladı') })).rejects.toThrow('patladı')

    // Slot serbest kalmadıysa bu çağrı sonsuza kadar beklerdi
    await expect(run(async () => 'ok')).resolves.toBe('ok')
  })

  it('bekleyen işleri sırayla çalıştırır', async () => {
    const run = createSemaphore(1)
    const order: number[] = []

    await Promise.all([1, 2, 3].map((n) => run(async () => {
      await new Promise((r) => setTimeout(r, 5))
      order.push(n)
    })))

    expect(order).toEqual([1, 2, 3])
  })
})
