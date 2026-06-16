// Regression test for the SSRF address guard (lib/net/ssrf.ts).
// Covers the IPv4-mapped-IPv6 bypass the security audit found
// (new URL("http://[::ffff:127.0.0.1]/").hostname === "[::ffff:7f00:1]", which
// classified as public before the fix) plus the default-deny IPv6 behavior.
// Pure/sync, no network. Usage: node scripts/ssrf-test.mjs
import { ipIsPrivate } from "../lib/net/ssrf.ts";

// Classify the way the real outbound path does: take a URL, read its
// (WHATWG-normalized) hostname, strip brackets, classify.
function urlHostIsPrivate(u) {
  const host = new URL(u).hostname.replace(/^\[|\]$/g, "");
  return ipIsPrivate(host);
}

const PRIVATE_IPS = [
  "127.0.0.1",
  "169.254.169.254", // cloud metadata
  "10.0.0.5",
  "192.168.1.1",
  "172.16.0.1",
  "100.64.0.1", // CGNAT
  "::1",
  "::ffff:127.0.0.1", // mapped, dotted
  "::ffff:7f00:1", // mapped, hex — THE BYPASS
  "::ffff:a9fe:a9fe", // 169.254.169.254 mapped, hex
  "fe80::1", // link-local
  "fc00::1", // ULA
  "ff02::1", // multicast
];

const PUBLIC_IPS = ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"];

// The exact URLs an attacker would save — exercised through new URL() so the
// hex-normalization that caused the bypass is in the loop.
const PRIVATE_URLS = [
  "http://[::ffff:127.0.0.1]/",
  "https://[::ffff:7f00:1]:8080/",
  "http://[::ffff:a9fe:a9fe]/latest/meta-data/",
  "http://[::1]/",
  "http://127.0.0.1/",
];

let pass = 0;
let fail = 0;
const expect = (cond, msg) => (cond ? pass++ : (fail++, console.error(`FAIL: ${msg}`)));

for (const ip of PRIVATE_IPS) expect(ipIsPrivate(ip) === true, `${ip} should be private`);
for (const ip of PUBLIC_IPS) expect(ipIsPrivate(ip) === false, `${ip} should be public`);
for (const u of PRIVATE_URLS) expect(urlHostIsPrivate(u) === true, `${u} host should be private`);

console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
