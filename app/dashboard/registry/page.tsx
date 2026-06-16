import { ShieldCheck } from "lucide-react";
import { currentProjectId, listServers } from "@/lib/db/repository";
import { GlassCard, PageHeader, StatusBadge, type Tone } from "@/components/dashboard/primitives";
import { InstallButton } from "@/components/dashboard/registry-install";
import { REGISTRY } from "@/lib/registry/catalog";

const riskTone: Record<string, Tone> = { low: "neutral", moderate: "review", high: "bad" };

export default async function RegistryPage() {
  const projectId = await currentProjectId();
  const servers = await listServers(projectId);
  const installed = new Set(
    servers.map((s) => s.registryId).filter((x): x is string => Boolean(x)),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="MCP Registry"
        description="Curated local MCP servers with a risk score, supply-chain advice, and pre-built Polyshield policies. One click registers the server and gates its dangerous tools before it ever runs."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {REGISTRY.map((entry) => (
          <GlassCard key={entry.id} className="flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">{entry.name}</h2>
                  <StatusBadge label={`${entry.risk} risk`} tone={riskTone[entry.risk]} />
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{entry.description}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/70">Why it&apos;s risky:</span> {entry.riskReason}
            </p>

            {entry.recommendedPolicies.length > 0 ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-violet-deep">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {entry.recommendedPolicies.length} starter {entry.recommendedPolicies.length === 1 ? "policy" : "policies"} included
              </p>
            ) : null}

            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <a
                href={entry.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                {entry.pkg}
              </a>
              <InstallButton entry={entry} installed={installed.has(entry.id)} />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
