// Apply SQL migration files to the database in SUPABASE_DB_URL.
// Usage: node scripts/db-migrate.mjs supabase/migrations/0002_gateway.sql
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
  console.error("SUPABASE_DB_URL is not set (env or .env.local)");
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/db-migrate.mjs <file.sql> [...]");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    console.log(`applying ${file} ...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }
} finally {
  await client.end();
}
