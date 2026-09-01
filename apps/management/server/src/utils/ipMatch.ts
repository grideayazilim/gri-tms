/* ========================================================================
   IP EŞLEŞTİRME (CIDR)

   İç ağ aralıklarını giriş IP sayacından muaf tutmak için küçük bir IPv4 CIDR
   eşleştirici. Okulda tüm bilgisayarlar tek bir dış IP'nin arkasında olduğu
   için IP sayacı tek bir kullanıcının hatalı denemeleriyle herkesi kilitleyebilir.

   Kullanıcı adı sayacı HİÇBİR ZAMAN muaf tutulmaz — iç ağdan gelen bir saldırı
   da engellenmiş kalır.
   ======================================================================== */

interface Ipv4Rule {
  base: number;
  mask: number;
}

/** IPv4-mapped IPv6 adreslerini (::ffff:10.0.0.1) düz IPv4'e indirger. */
function normalizeIp(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}

/** Noktalı IPv4'ü 32 bitlik sayıya çevirir; geçersizse null. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    result = result * 256 + octet;
  }
  return result;
}

/* Virgülle ayrılmış IP / IPv4 CIDR listesini kurallara çevirir.
   Örnek: "10.0.0.0/8, 192.168.1.0/24, 203.0.113.7".
   IPv6 girdilerde tam metin eşleşmesi aranır. */
export function parseIpAllowlist(raw: string | undefined): {
  rules: Ipv4Rule[];
  exact: Set<string>;
} {
  const rules: Ipv4Rule[] = [];
  const exact = new Set<string>();

  for (const rawEntry of (raw ?? '').split(',')) {
    const entry = normalizeIp(rawEntry);
    if (!entry) continue;

    const [address, prefixPart] = entry.split('/');
    const base = address !== undefined ? ipv4ToInt(address) : null;

    if (base === null) {
      // IPv6 ya da bozuk girdi — tam eşleşme olarak sakla
      exact.add(entry);
      continue;
    }

    const prefix = prefixPart === undefined ? 32 : Number(prefixPart);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) continue;

    // prefix 0 için `<<` taşmasını önle (32 bit kaydırma JS'te no-op'tur)
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    rules.push({ base: (base & mask) >>> 0, mask });
  }

  return { rules, exact };
}

/** Verilen IP listedeki aralıklardan birine giriyor mu? */
export function isIpAllowlisted(
  ip: string | undefined,
  allowlist: { rules: Ipv4Rule[]; exact: Set<string> },
): boolean {
  if (!ip) return false;

  const normalized = normalizeIp(ip);
  if (allowlist.exact.has(normalized)) return true;

  const value = ipv4ToInt(normalized);
  if (value === null) return false;

  return allowlist.rules.some((rule) => ((value & rule.mask) >>> 0) === rule.base);
}
