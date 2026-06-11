import type { McpServer, RawTool } from "./types";

/**
 * Demo downstream MCP servers. These stand in for real MCP connections —
 * each one reports its raw tools through the same tools/list-shaped
 * interface a real server would (see connector.ts).
 */
export const MOCK_SERVERS: McpServer[] = [
  {
    id: "mcp_analytics",
    name: "Demo Analytics MCP",
    prefix: "analytics",
    kind: "mock",
    status: "connected",
    transport: { type: "http", endpoint: "mock://demo-analytics" },
    description: "Read-only reporting and channel analytics.",
    lastActionAt: null,
  },
  {
    id: "mcp_crm",
    name: "Demo CRM MCP",
    prefix: "crm",
    kind: "mock",
    status: "connected",
    transport: {
      type: "http",
      endpoint: "mock://demo-crm",
      authHeader: "Bearer ••••a4f1",
    },
    description: "Customer records, contacts, and account status.",
    lastActionAt: null,
  },
  {
    id: "mcp_email",
    name: "Demo Email MCP",
    prefix: "email",
    kind: "mock",
    status: "connected",
    transport: {
      type: "stdio",
      command: "npx",
      args: ["@demo/email-mcp@latest"],
      env: { EMAIL_API_KEY: "••••9c2e" },
      envPassthrough: [],
    },
    description: "Inbox access, drafting, and outbound email.",
    lastActionAt: null,
  },
  {
    id: "mcp_project",
    name: "Demo Project Management MCP",
    prefix: "project",
    kind: "mock",
    status: "connected",
    transport: {
      type: "stdio",
      command: "npx",
      args: ["@demo/projects-mcp@latest"],
      env: {},
      envPassthrough: ["HOME"],
      cwd: "~/work",
    },
    description: "Projects, workspaces, and archival operations.",
    lastActionAt: null,
  },
  {
    id: "mcp_billing",
    name: "Demo Billing MCP",
    prefix: "billing",
    kind: "mock",
    status: "connected",
    transport: {
      type: "http",
      endpoint: "mock://demo-billing",
      authHeader: "Bearer ••••77d0",
    },
    description: "Invoices, charges, and customer refunds.",
    lastActionAt: null,
  },
];

/**
 * Raw tools each mock server reports from tools/list. Names here are the
 * *downstream* names — Polyshield namespaces them before exposing them to
 * the agent (e.g. get_reports → analytics.get_reports).
 */
export const MOCK_RAW_TOOLS: Record<string, RawTool[]> = {
  mcp_analytics: [
    {
      name: "get_reports",
      description: "Fetch channel or product analytics reports for a date range.",
      inputSchema: {
        type: "object",
        properties: {
          range: { type: "string", description: "e.g. last_28_days" },
        },
      },
    },
    {
      name: "generate_summary",
      description: "Generate a natural-language summary of recent metrics.",
      inputSchema: {
        type: "object",
        properties: { report_id: { type: "string" } },
      },
    },
  ],
  mcp_crm: [
    {
      name: "search_contacts",
      description: "Search contacts by name, email, or company.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
      },
    },
    {
      name: "update_contact",
      description: "Update fields on an existing contact record.",
      inputSchema: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          status: { type: "string" },
        },
        required: ["contact_id"],
      },
    },
  ],
  mcp_email: [
    {
      name: "list_inbox",
      description: "List recent messages in the connected inbox.",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
    {
      name: "create_draft",
      description: "Create a draft email without sending it.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
      },
    },
    {
      name: "send_external",
      description: "Send an email to an address outside the organization.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["to"],
      },
    },
  ],
  mcp_project: [
    {
      name: "list_projects",
      description: "List projects and workspaces visible to the connection.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "archive_project",
      description: "Archive a project. Reversible, but disruptive to teams.",
      inputSchema: {
        type: "object",
        properties: { project_id: { type: "string" } },
        required: ["project_id"],
      },
    },
    {
      name: "delete_workspace",
      description: "Permanently delete a workspace and all of its projects.",
      inputSchema: {
        type: "object",
        properties: { workspace_id: { type: "string" } },
        required: ["workspace_id"],
      },
    },
  ],
  mcp_billing: [
    {
      name: "get_invoices",
      description: "Fetch invoices for a customer account.",
      inputSchema: {
        type: "object",
        properties: { customer_id: { type: "string" } },
      },
    },
    {
      name: "refund_customer",
      description: "Issue a refund to a customer payment method.",
      inputSchema: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
          amount: { type: "number" },
        },
        required: ["customer_id", "amount"],
      },
    },
  ],
};
