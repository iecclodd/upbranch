import { MOCK_RAW_TOOLS } from "./mock-mcps";
import type { CatalogTool, McpServer, RawTool } from "./types";

/**
 * Polyshield acts as an MCP client toward every downstream server. A
 * connector wraps one downstream connection; `listTools` mirrors the MCP
 * `tools/list` request. Real servers get a real transport later — the rest
 * of the app only ever talks to this interface.
 */
export interface McpConnector {
  listTools(): Promise<RawTool[]>;
}

class MockMcpConnector implements McpConnector {
  constructor(private serverId: string) {}

  listTools(): Promise<RawTool[]> {
    return Promise.resolve(MOCK_RAW_TOOLS[this.serverId] ?? []);
  }
}

/**
 * Simulated discovery for user-added servers (demo mode). Real transports
 * replace `simulatedToolsFor` with an actual MCP client handshake:
 *  - http: open a streamable-HTTP connection to the endpoint and call tools/list
 *  - stdio: ask the local runner (outbound-connected to the control plane)
 *    to spawn the command and proxy tools/list back
 */
class SimulatedMcpConnector implements McpConnector {
  constructor(private prefix: string) {}

  listTools(): Promise<RawTool[]> {
    return Promise.resolve(simulatedToolsFor(this.prefix));
  }
}

export function getConnector(server: McpServer): McpConnector {
  return server.kind === "mock"
    ? new MockMcpConnector(server.id)
    : new SimulatedMcpConnector(server.prefix);
}

/** Plausible tools/list results for well-known namespaces, demo mode only. */
const KNOWN_DISCOVERY: Record<string, RawTool[]> = {
  playwright: [
    { name: "navigate", description: "Navigate the browser to a URL.", inputSchema: { type: "object", properties: { url: { type: "string" } } } },
    { name: "click", description: "Click an element on the page.", inputSchema: { type: "object", properties: { selector: { type: "string" } } } },
    { name: "fill", description: "Type text into an input.", inputSchema: { type: "object", properties: { selector: { type: "string" }, value: { type: "string" } } } },
    { name: "screenshot", description: "Capture a screenshot of the page.", inputSchema: { type: "object", properties: {} } },
  ],
  github: [
    { name: "list_issues", description: "List issues in a repository.", inputSchema: { type: "object", properties: { repo: { type: "string" } } } },
    { name: "create_pull_request", description: "Open a pull request.", inputSchema: { type: "object", properties: { repo: { type: "string" }, title: { type: "string" } } } },
    { name: "merge_pull_request", description: "Merge a pull request.", inputSchema: { type: "object", properties: { repo: { type: "string" }, number: { type: "number" } } } },
    { name: "delete_repository", description: "Permanently delete a repository.", inputSchema: { type: "object", properties: { repo: { type: "string" } } } },
  ],
  filesystem: [
    { name: "read_file", description: "Read a file from the workspace.", inputSchema: { type: "object", properties: { path: { type: "string" } } } },
    { name: "write_file", description: "Write contents to a file.", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } } } },
    { name: "list_directory", description: "List entries in a directory.", inputSchema: { type: "object", properties: { path: { type: "string" } } } },
    { name: "delete_file", description: "Delete a file from the workspace.", inputSchema: { type: "object", properties: { path: { type: "string" } } } },
  ],
  slack: [
    { name: "list_channels", description: "List channels in the workspace.", inputSchema: { type: "object", properties: {} } },
    { name: "post_message", description: "Post a message to a channel.", inputSchema: { type: "object", properties: { channel: { type: "string" }, text: { type: "string" } } } },
    { name: "send_dm", description: "Send a direct message to a user.", inputSchema: { type: "object", properties: { user: { type: "string" }, text: { type: "string" } } } },
  ],
};

const GENERIC_DISCOVERY: RawTool[] = [
  { name: "search", description: "Search records exposed by this server.", inputSchema: { type: "object", properties: { query: { type: "string" } } } },
  { name: "get_item", description: "Fetch a single record by id.", inputSchema: { type: "object", properties: { id: { type: "string" } } } },
  { name: "create_item", description: "Create a new record.", inputSchema: { type: "object", properties: { data: { type: "object" } } } },
  { name: "delete_item", description: "Permanently delete a record.", inputSchema: { type: "object", properties: { id: { type: "string" } } } },
];

export function simulatedToolsFor(prefix: string): RawTool[] {
  return KNOWN_DISCOVERY[prefix.toLowerCase()] ?? GENERIC_DISCOVERY;
}

/**
 * Raw tool names with destructive or outbound verbs get auto-gated with a
 * require_approval policy on discovery — risky tools are never exposed
 * wide-open by default.
 */
export function isRiskyRawTool(rawName: string): boolean {
  return /^(delete|remove|drop|destroy|send|publish|deploy|refund|transfer|merge)/i.test(
    rawName,
  );
}

/**
 * Map a raw downstream tool into Polyshield's catalog. The agent only sees
 * `exposedName`; on a call Polyshield maps it back to `rawName` and forwards
 * to the source server (if policy allows).
 */
export function toCatalogTool(server: McpServer, raw: RawTool): CatalogTool {
  return {
    id: `tool_${server.prefix}_${raw.name}`,
    serverId: server.id,
    rawName: raw.name,
    rawDescription: raw.description,
    inputSchema: raw.inputSchema,
    exposedName: `${server.prefix}.${raw.name}`,
    enabled: true,
  };
}

/** Discover a server's tools (tools/list) and map them into the catalog. */
export async function discoverTools(server: McpServer): Promise<CatalogTool[]> {
  const raw = await getConnector(server).listTools();
  return raw.map((tool) => toCatalogTool(server, tool));
}
