/* ============================================
   PUANTAJ İŞARETÇİLERİ (MARKERS)
   ============================================ */

export const MARKERS = Object.freeze({
    // Key 'I' (ASCII), code değeri 'İ' (Türkçe büyük İ) — kasıtlı farklılık.
    // Key: JS property adı (ASCII uyumlu), code: veritabanında ve puantajda kullanılan gerçek değer.
    X:  { code: "X",  label: "Geldi",         isPaid: true  },
    I:  { code: "İ",  label: "İzinli",         isPaid: false },
    DT: { code: "DT", label: "Devlet Tatili",  isPaid: false },
    R:  { code: "R",  label: "Raporlu",        isPaid: false },
    RT: { code: "RT", label: "Resmi Tatil",    isPaid: false },
} as const);

export type MarkerCode = typeof MARKERS[keyof typeof MARKERS]['code'];

export const MARKER_LIST = Object.values(MARKERS);

// Set<string> yerine Set<MarkerCode> — .has() çağrısında tip güvenliği sağlanır
export const PAID_CODES: Set<MarkerCode> = new Set(
    MARKER_LIST.filter(m => m.isPaid).map(m => m.code),
);
