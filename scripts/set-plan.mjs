// Manually set a user's billing plan for LOCAL TESTING without Stripe.
// Connects directly to the DB (as the owner), so it bypasses the column lock
// that makes profiles.plan otherwise writable only through the proof-gated
// Stripe sync. Use this to exercise each tier's perks.
//
// Usage: node scripts/set-plan.mjs <email-or-user-uuid> <free|builder|team|enterprise>
import { readFileSync } from "node:fs";
import pg from "pg";

const [who, plan] = process.argv.slice(2);
const PLANS = ["free", "builder", "team", "enterprise"];
if (!who || !PLANS.includes(plan)) {
  console.error("Usage: node scripts/set-plan.mjs <email-or-user-uuid> <free|builder|team|enterprise>");
  process.exit(1);
}

const url = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  .match(/^SUPABASE_DB_URL=(.+)$/m)[1]
  .trim();

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  const res = await c.query(
    `update profiles
       set plan = $2, plan_status = 'active'
     where id::text = $1 or email = $1
     returning id, email, plan`,
    [who, plan],
  );
  console.log(JSON.stringify(res.rows, null, 2));
  console.log(res.rowCount ? `Updated ${res.rowCount} profile(s) to "${plan}".` : "No matching profile found.");
} finally {
  await c.end();
}
