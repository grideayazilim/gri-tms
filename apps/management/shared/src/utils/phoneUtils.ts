/* ============================================
   TELEFON NUMARASI YARDIMCI FONKSİYONLARI
   Giriş formatından bağımsız normalize ve doğrulama
   ============================================ */

/** Normalize edilmiş telefon numarasının uzunluğu: "0555 555 4455" → 13 karakter */
export const FORMATTED_PHONE_LENGTH = 13;

/**
 * Telefon numarasını normalize eder.
 * Kabul edilen girişler: +905551234455, 905551234455, 05551234455, 5551234455,
 * boşluklu/parantezli/tireli varyasyonlar.
 * Çıktı: "0555 123 4455" formatında string, geçersizse null.
 */
export function normalizePhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');

    let tenDigit: string;
    if (digits.length === 12 && digits.startsWith('90')) {
        tenDigit = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
        tenDigit = digits.slice(1);
    } else if (digits.length === 10) {
        tenDigit = digits;
    } else {
        return null;
    }

    if (!/^5\d{9}$/.test(tenDigit)) return null;

    return `0${tenDigit.slice(0, 3)} ${tenDigit.slice(3, 6)} ${tenDigit.slice(6)}`;
}

/**
 * Kullanıcı yazarken telefon numarasını canlı olarak "0555 555 4455" şeklinde gruplar.
 * Rakam olmayan karakterleri yok sayar, sonucu en fazla "0" + 10 haneli ulusal numara ile sınırlar.
 */
export function formatPhoneAsTyped(raw: string): string {
    let digits = raw.replace(/\D/g, '');

    if (digits.length >= 12 && digits.startsWith('90')) {
        digits = digits.slice(2);
    }
    if (digits.length === 10 && digits.startsWith('5')) {
        digits = `0${digits}`;
    }
    digits = digits.slice(0, 11);

    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}
