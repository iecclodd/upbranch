import { readFileSync } from "node:fs";
import pg from "pg";
const envLocal = (n) =>
  readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(new RegExp(`^${n}=(.+)$`, "m"))?.[1]?.trim();
const c = new pg.Client({ connectionString: envLocal("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
await c.connect();
const pid = "627a00d8-c0df-476d-98d6-3f9de7486afc";
let rows = [];
for (let i = 0; i < 40; i++) {
  const r = await c.query(
    "select raw_name, exposed_name, enabled, risk from catalog_tools where project_id=$1 order by raw_name",
    [pid],
  );
  if (r.rows.length) { rows = r.rows; break; }
  // also surface server status while we wait
  await new Promise((s) => setTimeout(s, 2000));
}
const st = await c.query("select name, status, status_detail from mcp_servers where project_id=$1", [pid]);
console.log("server:", JSON.stringify(st.rows));
console.log("tools (" + rows.length + "):");
console.log(JSON.stringify(rows, null, 1));
await c.end();
