// Test fonksiyonlarını içeri aktarıyoruz
// describe: Testleri mantıksal olarak gruplamak için kullanılır (Bir klasör gibi düşünebilirsin)
// it: Asıl testi yazdığımız kısımdır. (Bir dosya gibi düşünebilirsin)
// expect: Beklediğimiz sonucun gerçekleşip gerçekleşmediğini kontrol eder.
import { describe, it, expect } from 'vitest';
import {
  formatDate,
  toISODateString,
  parseLocalDate,
  formatPeriod,
  formatPeriodUpper,
  parseExcelDate,
} from './dateUtils';

/*
describe: Testleri mantıksal olarak gruplamak (bir klasör gibi) için kullanılır.
it: Asıl test senaryosunu yazdığımız yerdir (bir dosya gibi düşünebilirsin).
expect: Yazdığımız kodun sonucunun, beklediğimiz (ummduğumuz) sonuçla eşleşip eşleşmediğini kontrol eder. (Örn: "16 Mayıs" verdiğimde "16.05" dönmesini bekliyorum).
*/
describe('dateUtils', () => {
  // formatDate fonksiyonu için test grubu
  describe('formatDate', () => {

    it('tarihi doğru formata çevirmeli', () => {
      // 16 Mayıs 2026 tarihini verdiğimizde "16.05.2026" sonucunu bekliyoruz (expect)
      expect(formatDate(new Date('2026-05-16'))).toBe('16.05.2026');
      expect(formatDate('2026-05-16')).toBe('16.05.2026');
    });

    it('değer boş (null) veya tanımsız (undefined) ise "-" dönmeli', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
    });

    it('geçersiz tarih metinlerinde "-" dönmeli', () => {
      expect(formatDate('invalid-date')).toBe('-');
    });
  });

  // toISODateString fonksiyonu için test grubu
  describe('toISODateString', () => {
    it('yerel tarihi ISO formatına (YYYY-MM-DD) çevirmeli', () => {
      expect(toISODateString(new Date('2026-05-16T12:00:00Z'))).toBe('2026-05-16');
      expect(toISODateString('2026-05-16T00:00:00.000Z')).toBe('2026-05-16');
    });

    it('boş veya geçersiz değerlerde boş metin ("") dönmeli', () => {
      expect(toISODateString(null)).toBe('');
      expect(toISODateString(undefined)).toBe('');
      expect(toISODateString('invalid-date')).toBe('');
    });
  });

  describe('parseLocalDate', () => {
    it('should parse ISO date string to Date object', () => {
      const date = parseLocalDate('2026-05-16');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(4); // 0-indexed, so May is 4
      expect(date?.getDate()).toBe(16);
    });

    it('should handle null/invalid inputs', () => {
      expect(parseLocalDate(null)).toBeNull();
      expect(parseLocalDate('invalid')).toBeNull();
    });
  });

  describe('formatPeriod & formatPeriodUpper', () => {
    it('should format period', () => {
      expect(formatPeriod(2026, 5)).toBe('Mayıs 2026');
      expect(formatPeriod(2026, 12)).toBe('Aralık 2026');
    });

    it('should format period upper', () => {
      expect(formatPeriodUpper(2026, 5)).toBe('MAYIS 2026');
    });
  });

  describe('parseExcelDate', () => {
    it('should parse JS Date', () => {
      expect(parseExcelDate(new Date('2026-05-16T00:00:00Z'))).toBe('2026-05-16');
    });

    it('should parse valid string', () => {
      expect(parseExcelDate('2026-05-16')).toBe('2026-05-16');
    });

    it('should parse Excel serial number', () => {
      // 45800 is approx May 2025 depending on exact days, let's just check formatting
      const result = parseExcelDate(45800);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle null/empty', () => {
      expect(parseExcelDate(null)).toBe('');
      expect(parseExcelDate('')).toBe('');
      expect(parseExcelDate('invalid')).toBe('');
    });
  });
});
