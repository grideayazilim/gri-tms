/* ============================================
   PUANTAJ İŞARETÇİLERİ (MARKERS)
   ============================================ */

export const MARKERS = Object.freeze({
    X: { code: "X", label: "Geldi", isPaid: true },
    I: { code: "İ", label: "İzinli", isPaid: false },
    DT: { code: "DT", label: "Devlet Tatili", isPaid: false },
    R: { code: "R", label: "Raporlu", isPaid: false },
    RT: { code: "RT", label: "Resmi Tatil", isPaid: false },
});

export const MARKER_LIST = Object.values(MARKERS);
export const PAID_CODES = new Set(MARKER_LIST.filter(m => m.isPaid).map(m => m.code));
