// Run a single SQL statement against SUPABASE_DB_URL (overnight E2E helper).
// Usage: node scripts/db-exec.mjs "select 1"
import { readFileSync } from "node:fs";
import pg from "pg";

const url = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .match(/^SUPABASE_DB_URL=(.+)$/m)[1]
  .trim();
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  const res = await c.query(process.argv[2]);
  console.log(JSON.stringify(res.rows ?? [], null, 2));
  if (res.rowCount !== null) console.log(`(${res.rowCount} rows)`);
} finally {
  await c.end();
}
