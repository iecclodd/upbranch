"use client";

import { useMemo } from "react";
import { Eye } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import {
  GlassCard,
  PageHeader,
  Pill,
  decisionTone,
} from "@/components/dashboard/primitives";
import { resolvePolicy } from "@/lib/dashboard/seed";
import { cn } from "@/lib/utils";

export default function ToolsPage() {
  const { state, toggleTool } = useDashboard();

  const serverNames = useMemo(
    () => new Map(state.servers.map((s) => [s.id, s.name])),
    [state.servers],
  );

  const exposedCount = state.tools.filter((t) => t.enabled).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tool Catalog"
        description="Tools discovered from connected MCP servers via tools/list. Polyshield exposes only the enabled tools to your agent, under its own namespace."
      />

      <GlassCard className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center">
        <span className="inline-flex shrink-0 rounded-xl bg-violet/10 p-2.5">
          <Eye className="h-4 w-4 text-violet" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-foreground">
            What the agent actually sees
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            The agent connects to one MCP server — Polyshield — and discovers{" "}
            <span className="font-semibold text-foreground">
              {exposedCount} exposed tools
            </span>
            , not the raw downstream tools. Polyshield maps each call back to
            the source server after checking policy.
          </p>
        </div>
        <pre className="shrink-0 rounded-xl bg-ink px-4 py-3 font-mono text-xs leading-5 text-white/90">
          {`"mcpServers": {
  "polyshield": {
    "url": "https://gw.polyshield.dev/mcp"
  }
}`}
        </pre>
      </GlassCard>

      <GlassCard className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th className="px-6 py-4 font-semibold">Exposed tool</th>
              <th className="px-4 py-4 font-semibold">Source MCP</th>
              <th className="px-4 py-4 font-semibold">Raw tool</th>
              <th className="px-4 py-4 font-semibold">Policy</th>
              <th className="px-6 py-4 text-right font-semibold">
                Exposed to agent
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {state.tools.map((tool) => {
              const { decision, policy } = resolvePolicy(
                state.policies,
                tool.exposedName,
              );
              return (
                <tr
                  key={tool.id}
                  className={cn(
                    "transition-colors hover:bg-violet/[0.03]",
                    !tool.enabled && "opacity-45",
                  )}
                >
                  <td className="px-6 py-3.5">
                    <p className="font-mono text-[13px] font-semibold text-foreground">
                      {tool.exposedName}
                    </p>
                    <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                      {tool.rawDescription}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-foreground/80">
                    {serverNames.get(tool.serverId)}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px] text-muted-foreground">
                    {tool.rawName}
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill
                      label={policy ? decision : `${decision} (default)`}
                      tone={decisionTone(decision)}
                    />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={tool.enabled}
                      aria-label={`Expose ${tool.exposedName} to the agent`}
                      onClick={() => toggleTool(tool.id)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        tool.enabled ? "bg-violet" : "bg-ink/15",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform",
                          tool.enabled ? "translate-x-[22px]" : "translate-x-1",
                        )}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
