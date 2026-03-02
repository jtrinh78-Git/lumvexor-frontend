import { useParams } from "react-router-dom";

// SECTION: ProjectOverview
export function ProjectOverview() {
  const { projectId } = useParams();

  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Overview</h2>

      <div className="lvx-grid">
        <div className="lvx-card">
          <div className="lvx-card-title">Visibility Status</div>
          <div className="lvx-muted">
            Project <strong>{projectId}</strong> workspace is live. Next: previews + watermarks + expiration rules.
          </div>
        </div>

        <div className="lvx-card">
          <div className="lvx-card-title">Cadence</div>
          <ul className="lvx-list">
            <li>Tier: (pending)</li>
            <li>Posts/week: (pending)</li>
            <li>Next publish date: (pending)</li>
          </ul>
        </div>

        <div className="lvx-card">
          <div className="lvx-card-title">Controls</div>
          <div className="lvx-muted">
            Later: agent assignment, billing state, platform config.
          </div>
        </div>
      </div>
    </div>
  );
}