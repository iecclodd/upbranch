// Static regression checks for the audit hardening migration.
// Run: node scripts/security-migration-test.mjs
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/0016_security_audit_fixes.sql", "utf8");

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL ${name}`);
  }
}

function has(pattern) {
  return pattern.test(sql);
}

for (const table of ["runner_jobs", "audit_log", "approvals"]) {
  check(
    `${table}: old owner policy dropped`,
    has(new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"[^"]*"\\s+on\\s+public\\.${table}`, "i")),
  );
  check(
    `${table}: direct DML revoked`,
    has(new RegExp(`revoke\\s+insert,\\s*update,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public,\\s*anon,\\s*authenticated`, "i")),
  );
  check(
    `${table}: owner read policy is select-only`,
    has(new RegExp(`create\\s+policy\\s+"[^"]+read"\\s+on\\s+public\\.${table}\\s+for\\s+select\\s+to\\s+authenticated`, "i")),
  );
}

for (const fn of [
  "dashboard_log_admin_event",
  "dashboard_claim_approval_decision",
  "dashboard_finish_approval",
  "dashboard_enqueue_approved_runner_job",
  "dashboard_enqueue_restore_job",
  "gateway_create_approval",
  "gateway_check_approval",
]) {
  check(`${fn}: security definer function exists`, has(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b[\\s\\S]*?security\\s+definer`, "i")));
  check(`${fn}: public execute revoked`, has(new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\b`, "i")));
}

check("privacy approval ciphertext column exists", has(/add\s+column\s+if\s+not\s+exists\s+args_ciphertext\s+text/i));
check("approval agent scope column exists", has(/add\s+column\s+if\s+not\s+exists\s+agent_id\s+uuid\s+references\s+public\.agents/i));
check("approval creation stores agent id", has(/project_id,\s+server_id,\s+audit_id,\s+policy_id,\s+agent_id,\s+agent,\s+exposed_tool/i));
check("approval polling requires the creating agent", has(/join\s+public\.agents\s+a\s+on\s+a\.id\s*=\s*ap\.agent_id\s+and\s+a\.project_id\s*=\s*ap\.project_id/i));
check("approval polling checks agent key", has(/where\s+a\.key_hash\s*=\s*p_key_hash\s+and\s+ap\.id\s*=\s*p_approval_id/i));
check("privacy approval ciphertext is cleared on finalization", has(/set\s+result\s*=\s*v_result,\s*args_ciphertext\s*=\s*null/i));
check("privacy approval args are redacted", has(/'_redacted',\s*true/i));
check("approved runner enqueue requires enabled tool", has(/ct\.raw_name\s*=\s*p_raw_name\s+and\s+ct\.enabled\s*=\s*true/i));
check("restore enqueue locks snapshot row", has(/for\s+update\s+of\s+rs/i));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
