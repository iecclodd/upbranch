// Standalone roundtrip of the vault crypto (mirrors lib/vault.ts) to prove
// secrets are real AES-256-GCM ciphertext, not plaintext or reversible mask.
import { readFileSync } from "node:fs";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const key = Buffer.from(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(
    /^POLYSHIELD_VAULT_KEY=(.+)$/m,
  )[1].trim(),
  "base64",
);
if (key.length !== 32) throw new Error(`key is ${key.length} bytes, expected 32`);

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}
function decrypt(ct) {
  const buf = Buffer.from(ct, "base64");
  const d = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

const secret = "Bearer sk-super-secret-token-12345";
const ct = encrypt(secret);
const back = decrypt(ct);
console.log("ciphertext:", ct.slice(0, 40), "...");
console.log("contains plaintext?", ct.includes("sk-super-secret"));
console.log("roundtrip ok?", back === secret);
// tamper check
try {
  const tampered = Buffer.from(ct, "base64");
  tampered[30] ^= 0xff;
  decrypt(tampered.toString("base64"));
  console.log("tamper rejected? NO (bug)");
} catch {
  console.log("tamper rejected? yes");
}
