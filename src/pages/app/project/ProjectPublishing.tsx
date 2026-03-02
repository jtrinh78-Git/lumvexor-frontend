import { useParams } from "react-router-dom";

// SECTION: ProjectPublishing
export function ProjectPublishing() {
  const { projectId } = useParams();

  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Publishing</h2>

      <div className="lvx-card">
        <div className="lvx-card-title">Cadence + Queue</div>
        <div className="lvx-muted">
          Scheduled posts, approvals, platform status, and audit trail.
        </div>
        <div className="lvx-muted" style={{ marginTop: 10 }}>
          Project: <strong>{projectId}</strong>
        </div>
      </div>
    </div>
  );
}