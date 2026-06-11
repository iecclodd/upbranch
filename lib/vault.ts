import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Credential vault crypto. Secrets are encrypted with AES-256-GCM before they
 * touch the database; the key lives only in the app server's environment.
 * There is no read-plaintext path for users — decryption happens solely when
 * the gateway or an approval execution injects the credential downstream.
 *
 * Ciphertext layout: base64( 12-byte IV | 16-byte auth tag | ciphertext ).
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function vaultKey(): Buffer {
  const raw = process.env.POLYSHIELD_VAULT_KEY;
  if (!raw) throw new Error("POLYSHIELD_VAULT_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("POLYSHIELD_VAULT_KEY must be 32 bytes, base64-encoded");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, vaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptSecret(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, vaultKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
