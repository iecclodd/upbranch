// Polyshield demo agent — a minimal MCP client that talks to the gateway the
// same way a real agent would (PRD R8).
//
// Usage:
//   node scripts/demo-agent.mjs list
//   node scripts/demo-agent.mjs call <tool> [json-args | key=value ...]
//   node scripts/demo-agent.mjs check <ticket-id>
//   node scripts/demo-agent.mjs wait <ticket-id>        (polls until decided)
//
// Env: POLYSHIELD_URL  (default http://localhost:3000/api/mcp)
//      POLYSHIELD_AGENT_KEY  (psk_live_...)

const url = process.env.POLYSHIELD_URL ?? "http://localhost:3000/api/mcp";
const key = process.env.POLYSHIELD_AGENT_KEY;
if (!key) {
  console.error("POLYSHIELD_AGENT_KEY is not set");
  process.exit(1);
}

let nextId = 1;
async function rpc(method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  if (res.status === 401) {
    console.error("Gateway rejected the agent key (401).");
    process.exit(1);
  }
  const body = await res.json();
  if (body.error) throw new Error(`${method} → ${body.error.message} (${body.error.code})`);
  return body.result;
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0].trim().startsWith("{")) return JSON.parse(argv[0]);
  const args = {};
  for (const pair of argv) {
    const eq = pair.indexOf("=");
    if (eq < 1) continue;
    const k = pair.slice(0, eq);
    const v = pair.slice(eq + 1);
    try {
      args[k] = JSON.parse(v);
    } catch {
      args[k] = v;
    }
  }
  return args;
}

function printToolResult(result) {
  for (const block of result?.content ?? []) {
    if (block.type === "text") console.log(block.text);
    else console.log(JSON.stringify(block, null, 2));
  }
  if (result?.isError) console.log("(isError: true)");
}

const init = await rpc("initialize", {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "polyshield-demo-agent", version: "0.1.0" },
});
console.log(`connected: ${init.serverInfo.name} ${init.serverInfo.version}\n`);

const [command, ...rest] = process.argv.slice(2);

if (command === "list" || command === undefined) {
  const { tools } = await rpc("tools/list", {});
  for (const t of tools) {
    console.log(`- ${t.name}${t.title && t.title !== t.name ? `  (${t.title})` : ""}`);
    if (t.description) console.log(`    ${t.description.split("\n")[0].slice(0, 120)}`);
  }
} else if (command === "call") {
  const [tool, ...argRest] = rest;
  const result = await rpc("tools/call", { name: tool, arguments: parseArgs(argRest) });
  printToolResult(result);
} else if (command === "check") {
  const result = await rpc("tools/call", {
    name: "polyshield_check_approval",
    arguments: { ticket_id: rest[0] },
  });
  printToolResult(result);
} else if (command === "wait") {
  for (;;) {
    const result = await rpc("tools/call", {
      name: "polyshield_check_approval",
      arguments: { ticket_id: rest[0] },
    });
    const text = result?.content?.[0]?.text ?? "";
    let status;
    try {
      status = JSON.parse(text)?.status;
    } catch {
      status = undefined;
    }
    if (status === "pending") {
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    console.log("");
    printToolResult(result);
    break;
  }
} else {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}
