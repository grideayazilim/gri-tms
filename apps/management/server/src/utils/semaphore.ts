/* ========================================================================
   SEMAFOR (EŞZAMANLILIK SINIRLAYICI)

   Excel üretimi senkron CPU harcar ve süresince event loop'u bloke eder. Aynı
   anda kaç ağır işin çalışabileceğini sınırlamak, eşzamanlı export taleplerinde
   sunucunun tamamen durmasını engeller. Bağımlılık eklememek için basit bir
   kuyruk kullanılır.
   ======================================================================== */

export type SemaphoreRunner = <T>(fn: () => Promise<T>) => Promise<T>;

export function createSemaphore(max: number): SemaphoreRunner {
  let active = 0;
  const queue: (() => void)[] = [];

  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}
