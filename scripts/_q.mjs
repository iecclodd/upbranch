// Throwaway ad-hoc SQL runner against SUPABASE_DB_URL (superuser). NOT for prod.
// Usage: node scripts/_q.mjs <file.sql>   (or pipe SQL on stdin)
import { readFileSync } from "node:fs";
import pg from "pg";

function readEnvLocal(name) {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const m = text.match(new RegExp(`^${name}=(.+)$`, "m"));
    return m?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const dbUrl = process.env.SUPABASE_DB_URL ?? readEnvLocal("SUPABASE_DB_URL");
if (!dbUrl) {
  console.error("no SUPABASE_DB_URL");
  process.exit(1);
}
const file = process.argv[2];
const sql = file ? readFileSync(file, "utf8") : readFileSync(0, "utf8");

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const res = await client.query(sql);
  const results = Array.isArray(res) ? res : [res];
  results.forEach((r, i) => {
    console.log(`\n=== result ${i} — ${r.command} (${r.rowCount ?? 0} rows) ===`);
    if (r.rows && r.rows.length) console.log(JSON.stringify(r.rows, null, 1));
  });
} catch (e) {
  console.error("SQL ERROR:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
