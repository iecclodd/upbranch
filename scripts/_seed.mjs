// Seed a throwaway project + agent + runner + filesystem stdio server for the
// live runner/sandbox/gateway test. Prints the agent key + runner token (shown
// once) so the harness can pair and call. NOT for production.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import pg from "pg";

function envLocal(name) {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  return text.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();
}
const sha = (s) => createHash("sha256").update(s).digest("hex");

const scopeDir = "C:\\Users\\Mohammed\\polyshield-sbx";
mkdirSync(scopeDir, { recursive: true });
mkdirSync(scopeDir + "\\sub", { recursive: true });
writeFileSync(scopeDir + "\\hello.txt", "in-scope file contents\n");
writeFileSync(scopeDir + "\\sub\\note.md", "# scoped note\n");

const agentKey = "psk_live_" + randomBytes(24).toString("hex");
const runnerToken = "prt_live_" + randomBytes(24).toString("hex");

const transport = {
  type: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", scopeDir],
  env: {},
  envPassthrough: [],
  cwd: scopeDir,
};
const sandbox = {
  fsScope: [scopeDir],
  stripEnv: true,
  egress: { mode: "none" },
  limits: { wallMs: 20000, memMB: 256 },
  containerize: false,
  dryRunOnApproval: true,
};

const client = new pg.Client({ connectionString: envLocal("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows: users } = await client.query("select id, email from auth.users order by created_at limit 1");
  if (!users.length) throw new Error("no auth.users to own the project");
  const ownerId = users[0].id;

  const { rows: [proj] } = await client.query(
    "insert into projects (owner_id, name) values ($1, $2) returning id",
    [ownerId, "PS LIVE TEST (delete me)"],
  );
  await client.query(
    "insert into agents (project_id, name, status, key_hash, key_preview) values ($1,$2,'active',$3,$4)",
    [proj.id, "test-agent", sha(agentKey), agentKey.slice(-4)],
  );
  await client.query(
    "insert into runners (project_id, name, token_hash) values ($1,$2,$3)",
    [proj.id, "test-runner", sha(runnerToken)],
  );
  const { rows: [srv] } = await client.query(
    `insert into mcp_servers (project_id, name, prefix, transport, sandbox_profile, status, shield_mode)
     values ($1,$2,$3,$4,$5,'pending','flag') returning id`,
    [proj.id, "Filesystem", "fs", JSON.stringify(transport), JSON.stringify(sandbox)],
  );

  console.log(JSON.stringify({
    ownerEmail: users[0].email,
    projectId: proj.id,
    serverId: srv.id,
    agentKey,
    runnerToken,
    scopeDir,
  }, null, 2));
} finally {
  await client.end();
}
