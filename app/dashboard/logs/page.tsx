import { currentProjectId, listAudit, listServers } from "@/lib/db/repository";
import { EmptyState, PageHeader } from "@/components/dashboard/primitives";
import { AuditLogsTable } from "@/components/dashboard/audit-logs-table";

export default async function LogsPage() {
  const projectId = await currentProjectId();
  const [servers, audit] = await Promise.all([
    listServers(projectId),
    listAudit(projectId),
  ]);
  const serverNames = Object.fromEntries(servers.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit Logs"
        description="Every requested action, the decision it hit, and who signed off."
      />
      {audit.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Once an agent makes a tool call through Polyshield, it shows up here."
        />
      ) : (
        <AuditLogsTable entries={audit} serverNames={serverNames} />
      )}
    </div>
  );
}
