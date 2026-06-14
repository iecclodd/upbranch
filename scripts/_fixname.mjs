import { readFileSync, writeFileSync } from "node:fs";
const p = new URL("../app/dashboard/actions.ts", import.meta.url);
let s = readFileSync(p, "utf8");
const clean = `function cleanName(input: string, max = 80): string {
  let out = "";
  for (const ch of (input ?? "").normalize("NFC")) {
    const c = ch.codePointAt(0) ?? 0;
    // drop C0/C1 control, zero-width, bidi overrides, word-joiner, BOM
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) continue;
    if (c >= 0x200b && c <= 0x200f) continue;
    if (c >= 0x202a && c <= 0x202e) continue;
    if (c === 0x2060 || c === 0xfeff) continue;
    out += ch;
  }
  return out.trim().slice(0, max);
}`;
const before = s;
s = s.replace(/function cleanName\(input: string, max = 80\): string \{[\s\S]*?\n\}/, clean);
if (s === before) {
  console.error("NO MATCH — cleanName not replaced");
  process.exit(1);
}
writeFileSync(p, s);
console.log("cleanName replaced OK");
