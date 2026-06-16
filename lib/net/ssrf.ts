import { isIP } from "node:net";

/**
 * SSRF address classification. Kept in its own module (no class/parameter-property
 * syntax) so it's directly unit-testable and reusable by every server-side
 * outbound path that fetches a user-controlled URL (MCP endpoints, notification
 * webhooks). The policy: an address is "private" — and must be refused — unless
 * it is a genuinely public, routable host.
 */

/**
 * Extract an embedded IPv4 from an IPv4-mapped/compatible IPv6, in EITHER the
 * dotted form (::ffff:127.0.0.1) or the hex form (::ffff:7f00:1) that WHATWG
 * `new URL()` normalizes mapped literals to. The hex form is the one that
 * previously slipped past the guard, so it must be handled here.
 */
export function embeddedV4(ip: string): string | null {
  let m = ip.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (m) return m[1];
  m = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (m) {
    const hi = parseInt(m[1], 16);
    const lo = parseInt(m[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

export function ipIsPrivate(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
    const [a, b] = p;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) || // link-local incl. cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      a >= 224 // multicast / reserved
    );
  }
  if (v !== 6) return true; // not a valid IP literal → fail closed

  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  // Classify any IPv4-mapped/compatible address by its embedded IPv4 (this
  // catches ::ffff:7f00:1 == 127.0.0.1 and ::ffff:a9fe:a9fe == 169.254.169.254).
  const v4 = embeddedV4(lower);
  if (v4) return ipIsPrivate(v4);
  if (lower === "::1" || lower === "::") return true;
  // DEFAULT-DENY for everything else: only 2000::/3 global unicast is treated as
  // public. Loopback, link-local (fe80::/10), ULA (fc00::/7), multicast
  // (ff00::/8), and any unrecognized category are private. Fail closed.
  const first = parseInt(lower.split(":")[0] || "0", 16);
  if (!Number.isFinite(first)) return true;
  return !(first >= 0x2000 && first <= 0x3fff);
}
