import { SiteShell } from '@/components/upbranch/ui/site-shell';
import { LabDashboard } from '@/components/upbranch/labs/lab-dashboard';
import { listPublishedMissions } from '@/lib/upbranch/catalog';

export default function LabsPage() {
  return <SiteShell><main id="main-content" tabIndex={-1}><LabDashboard missions={listPublishedMissions()} /></main></SiteShell>;
}
