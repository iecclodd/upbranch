"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isRiskyRawTool,
  simulatedToolsFor,
  toCatalogTool,
} from "@/lib/dashboard/connector";
import { maskSecret } from "@/lib/dashboard/format";
import { buildInitialState } from "@/lib/dashboard/seed";
import type {
  ApprovalMethod,
  ApprovalRequest,
  AuditEntry,
  CatalogTool,
  DashboardState,
  McpServer,
  Policy,
  PolicyDecision,
  TransportConfig,
} from "@/lib/dashboard/types";

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: "info" | "success" | "warn" | "error";
}

type Action =
  | { type: "RECORD_CALL"; entry: AuditEntry }
  | { type: "RECORD_HELD_CALL"; entry: AuditEntry; approval: ApprovalRequest }
  | {
      type: "DECIDE_APPROVAL";
      approvalId: string;
      decision: "approved" | "denied";
      approver: string;
      decidedAt: number;
      via: ApprovalMethod;
    }
  | { type: "TOGGLE_TOOL"; toolId: string }
  | { type: "SET_POLICY_DECISION"; policyId: string; decision: PolicyDecision }
  | { type: "ADD_SERVER"; server: McpServer }
  | {
      type: "SERVER_DISCOVERED";
      serverId: string;
      tools: CatalogTool[];
      policies: Policy[];
    };

function touchServer(
  servers: McpServer[],
  serverId: string,
  timestamp: number,
): McpServer[] {
  return servers.map((s) =>
    s.id === serverId ? { ...s, lastActionAt: timestamp } : s,
  );
}

function reducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case "RECORD_CALL":
      return {
        ...state,
        audit: [action.entry, ...state.audit],
        servers: touchServer(
          state.servers,
          action.entry.serverId,
          action.entry.timestamp,
        ),
      };
    case "RECORD_HELD_CALL":
      return {
        ...state,
        audit: [action.entry, ...state.audit],
        approvals: [action.approval, ...state.approvals],
        servers: touchServer(
          state.servers,
          action.entry.serverId,
          action.entry.timestamp,
        ),
      };
    case "DECIDE_APPROVAL": {
      const approval = state.approvals.find((a) => a.id === action.approvalId);
      if (!approval || approval.status !== "pending") return state;
      return {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.approvalId
            ? {
                ...a,
                status: action.decision,
                approver: action.approver,
                decidedAt: action.decidedAt,
                decidedVia: action.via,
              }
            : a,
        ),
        audit: state.audit.map((entry) =>
          entry.id === approval.auditId
            ? {
                ...entry,
                status: action.decision,
                approver: action.approver,
                decidedVia: action.via,
                reason:
                  action.decision === "approved"
                    ? `Approved — forwarded to source MCP. ${entry.reason ?? ""}`.trim()
                    : `Denied by approver. ${entry.reason ?? ""}`.trim(),
              }
            : entry,
        ),
        servers: touchServer(state.servers, approval.serverId, action.decidedAt),
      };
    }
    case "TOGGLE_TOOL":
      return {
        ...state,
        tools: state.tools.map((t) =>
          t.id === action.toolId ? { ...t, enabled: !t.enabled } : t,
        ),
      };
    case "SET_POLICY_DECISION":
      return {
        ...state,
        policies: state.policies.map((p) =>
          p.id === action.policyId ? { ...p, decision: action.decision } : p,
        ),
      };
    case "ADD_SERVER":
      return { ...state, servers: [...state.servers, action.server] };
    case "SERVER_DISCOVERED":
      return {
        ...state,
        servers: state.servers.map((s) =>
          s.id === action.serverId ? { ...s, status: "connected" } : s,
        ),
        tools: [...state.tools, ...action.tools],
        policies: [...state.policies, ...action.policies],
      };
    default:
      return state;
  }
}

export interface AddServerInput {
  name: string;
  prefix: string;
  transport: TransportConfig;
}

interface DashboardContextValue {
  state: DashboardState;
  toasts: Toast[];
  demoRunning: boolean;
  pendingCount: number;
  approve: (approvalId: string) => void;
  deny: (approvalId: string) => void;
  toggleTool: (toolId: string) => void;
  setPolicyDecision: (policyId: string, decision: PolicyDecision) => void;
  addServer: (input: AddServerInput) => void;
  runDemo: () => void;
  dismissToast: (id: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

const APPROVER = "you@polyshield.dev";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);
  const counter = useRef(1);

  const nextId = useCallback((prefix: string) => {
    counter.current += 1;
    return `${prefix}_${Date.now()}_${counter.current}`;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, body: string, tone: Toast["tone"] = "info") => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, body, tone }]);
      window.setTimeout(() => dismissToast(id), 5000);
    },
    [dismissToast],
  );

  const approve = useCallback(
    (approvalId: string) => {
      dispatch({
        type: "DECIDE_APPROVAL",
        approvalId,
        decision: "approved",
        approver: APPROVER,
        decidedAt: Date.now(),
        via: "dashboard",
      });
      pushToast(
        "Action approved",
        "Polyshield forwarded the call to the source MCP and logged the result.",
        "success",
      );
    },
    [pushToast],
  );

  const deny = useCallback(
    (approvalId: string) => {
      dispatch({
        type: "DECIDE_APPROVAL",
        approvalId,
        decision: "denied",
        approver: APPROVER,
        decidedAt: Date.now(),
        via: "dashboard",
      });
      pushToast(
        "Action denied",
        "The call was never forwarded. The agent receives a denial result.",
        "warn",
      );
    },
    [pushToast],
  );

  const toggleTool = useCallback((toolId: string) => {
    dispatch({ type: "TOGGLE_TOOL", toolId });
  }, []);

  const setPolicyDecision = useCallback(
    (policyId: string, decision: PolicyDecision) => {
      dispatch({ type: "SET_POLICY_DECISION", policyId, decision });
      pushToast("Policy updated", `Decision set to ${decision}.`, "info");
    },
    [pushToast],
  );

  const addServer = useCallback(
    (input: AddServerInput) => {
      // Write-only secrets: mask credential values before they touch app
      // state. In production the raw values go straight to the vault here.
      const transport: TransportConfig =
        input.transport.type === "http"
          ? {
              ...input.transport,
              authHeader: input.transport.authHeader
                ? maskSecret(input.transport.authHeader)
                : undefined,
            }
          : {
              ...input.transport,
              env: Object.fromEntries(
                Object.entries(input.transport.env).map(([k, v]) => [
                  k,
                  maskSecret(v),
                ]),
              ),
            };

      const server: McpServer = {
        id: nextId("mcp"),
        name: input.name,
        prefix: input.prefix,
        kind: "remote",
        status: "connecting",
        transport,
        description:
          transport.type === "stdio"
            ? "Local stdio server, launched via the Polyshield local runner."
            : "Remote HTTP server, connected by endpoint.",
        lastActionAt: null,
      };
      dispatch({ type: "ADD_SERVER", server });
      pushToast(
        "Initializing MCP client…",
        transport.type === "stdio"
          ? "The local runner is launching the command and calling tools/list."
          : "Connecting to the endpoint and calling tools/list.",
        "info",
      );

      // Simulated handshake — a real connection does exactly this, just over
      // an actual MCP transport instead of a timeout.
      window.setTimeout(() => {
        const rawTools = simulatedToolsFor(server.prefix);
        const tools = rawTools.map((raw) => toCatalogTool(server, raw));
        const policies: Policy[] = tools
          .filter((tool) => isRiskyRawTool(tool.rawName))
          .map((tool) => ({
            id: nextId("pol"),
            exposedTool: tool.exposedName,
            serverId: server.id,
            decision: "require_approval" as const,
            description:
              "Auto-gated on discovery — destructive or outbound verb detected.",
          }));
        dispatch({ type: "SERVER_DISCOVERED", serverId: server.id, tools, policies });
        pushToast(
          `${server.name} connected`,
          `tools/list discovered ${tools.length} tools (simulated). ${policies.length} risky tools were auto-gated with require_approval.`,
          "success",
        );
      }, 1600);
    },
    [nextId, pushToast],
  );

  const runDemo = useCallback(() => {
    if (demoRunning) return;
    setDemoRunning(true);
    pushToast(
      "Demo started",
      "demo-agent connected to the Polyshield MCP server.",
      "info",
    );

    window.setTimeout(() => {
      dispatch({
        type: "RECORD_CALL",
        entry: {
          id: nextId("aud"),
          timestamp: Date.now(),
          agent: "demo-agent",
          serverId: "mcp_analytics",
          exposedTool: "analytics.get_reports",
          decision: "allow",
          status: "allowed",
          reason: "Matched policy: read-only analytics.",
        },
      });
      pushToast(
        "analytics.get_reports → allowed",
        "Policy matched. Forwarded to Demo Analytics MCP.",
        "success",
      );
    }, 1000);

    window.setTimeout(() => {
      const auditId = nextId("aud");
      dispatch({
        type: "RECORD_HELD_CALL",
        entry: {
          id: auditId,
          timestamp: Date.now(),
          agent: "demo-agent",
          serverId: "mcp_crm",
          exposedTool: "crm.update_contact",
          decision: "require_approval",
          status: "waiting_for_approval",
          reason: "Update customer status based on recent activity.",
        },
        approval: {
          id: nextId("apr"),
          agent: "demo-agent",
          exposedTool: "crm.update_contact",
          serverId: "mcp_crm",
          args: { contact_id: "12345", status: "active" },
          reason: "Update customer status based on recent activity.",
          status: "pending",
          requestedAt: Date.now(),
          auditId,
        },
      });
      pushToast(
        "crm.update_contact → held",
        "Requires approval. The request is waiting in the Approval Queue.",
        "warn",
      );
      setDemoRunning(false);
    }, 2300);
  }, [demoRunning, nextId, pushToast]);

  const pendingCount = useMemo(
    () => state.approvals.filter((a) => a.status === "pending").length,
    [state.approvals],
  );

  const value = useMemo(
    () => ({
      state,
      toasts,
      demoRunning,
      pendingCount,
      approve,
      deny,
      toggleTool,
      setPolicyDecision,
      addServer,
      runDemo,
      dismissToast,
    }),
    [
      state,
      toasts,
      demoRunning,
      pendingCount,
      approve,
      deny,
      toggleTool,
      setPolicyDecision,
      addServer,
      runDemo,
      dismissToast,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return ctx;
}
