import { spawn } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const scope = "C:\\Users\\Mohammed\\polyshield-sbx";
const overlay = join(homedir(), ".polyshield", "overlays", "dbg-" + Date.now());
mkdirSync(overlay, { recursive: true });
cpSync(scope, overlay, { recursive: true });
// Replicate buildEnv(stripEnv:true)
const keep = ["PATH","Path","PATHEXT","SystemRoot","SYSTEMROOT","windir","COMSPEC","HOME","HOMEDRIVE","HOMEPATH","TEMP","TMP","LANG","LC_ALL"];
const env = {};
for (const k of keep) if (process.env[k] !== undefined) env[k] = process.env[k];
console.log("overlay:", overlay);
const child = spawn("npx", ["-y", "@modelcontextprotocol/server-filesystem", overlay], { env, shell: true });
let err = "", out = "";
child.stderr.on("data", (d) => (err += d));
child.stdout.on("data", (d) => (out += d));
child.on("error", (e) => console.log("SPAWN ERROR:", e.message));
child.on("exit", (code) => console.log("EXITED code", code));
setTimeout(() => {
  try { child.kill(); } catch {}
  console.log("STDERR:\n" + err.slice(0, 1500));
  console.log("STDOUT:\n" + out.slice(0, 500));
  process.exit(0);
}, 9000);
