import { useParams } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import { Card, CardBody, CardTitle } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";

// SECTION: ProjectOverview
export function ProjectOverview() {
  const { projectId } = useParams();

  return (
    <div className="lvx-page">
      <PageHeader
        title="Overview"
        subtitle="Workspace status, cadence, and operational controls."
        right={<Badge variant="accent">Workspace Active</Badge>}
      />

      <div className="lvx-grid">
        <Card>
          <CardTitle>Visibility Status</CardTitle>
          <CardBody>
            Project <strong>{projectId}</strong> workspace is live. Next: previews + watermarking + expiration rules.
          </CardBody>
        </Card>

        <Card>
          <CardTitle>Cadence</CardTitle>
          <CardBody>
            <ul className="lvx-list">
              <li>Tier: (pending)</li>
              <li>Posts/week: (pending)</li>
              <li>Next publish date: (pending)</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardTitle>Controls</CardTitle>
          <CardBody>Later: agent assignment, billing state, platform configuration.</CardBody>
        </Card>
      </div>
    </div>
  );
}