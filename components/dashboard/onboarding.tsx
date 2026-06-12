import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { GlassCard } from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

interface Step {
  done: boolean;
  title: string;
  body: string;
  href: string;
  cta: string;
}

/** First-run checklist shown on Overview until the gateway loop is closed. */
export function OnboardingChecklist({
  hasServer,
  hasAgent,
  hasAction,
}: {
  hasServer: boolean;
  hasAgent: boolean;
  hasAction: boolean;
}) {
  const steps: Step[] = [
    {
      done: hasServer,
      title: "Connect an MCP server",
      body: "Add a remote HTTP server or a local stdio one (via the local runner). Polyshield discovers its tools and auto-gates the risky ones.",
      href: "/dashboard/servers",
      cta: "Add server",
    },
    {
      done: hasAgent,
      title: "Create an agent key",
      body: "Each agent gets its own key and connects to Polyshield as its MCP server — it never sees your real credentials.",
      href: "/dashboard/agents",
      cta: "Create agent",
    },
    {
      done: hasAction,
      title: "Route a first call",
      body: "Make any tool call through the gateway and watch the decision land in the audit log.",
      href: "/dashboard/logs",
      cta: "Open logs",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Get set up</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={cn(
              "rounded-xl border p-4",
              step.done ? "border-ink/5 bg-ink/[0.02]" : "border-violet/20 bg-violet/[0.03]",
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done ? "bg-violet text-white" : "bg-violet/10 text-violet",
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <p
                className={cn(
                  "text-sm font-semibold",
                  step.done ? "text-foreground/50 line-through decoration-ink/30" : "text-foreground",
                )}
              >
                {step.title}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.body}</p>
            {!step.done ? (
              <Link
                href={step.href}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet hover:underline"
              >
                {step.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
