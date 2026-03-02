import { useParams } from "react-router-dom";

// SECTION: ProjectSettings
export function ProjectSettings() {
  const { projectId } = useParams();

  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Project Settings</h2>

      <div className="lvx-card">
        <div className="lvx-card-title">Configuration</div>
        <div className="lvx-muted">
          Brand onboarding, platforms, approvals, agent assignment, billing link.
        </div>
        <div className="lvx-muted" style={{ marginTop: 10 }}>
          Project: <strong>{projectId}</strong>
        </div>
      </div>
    </div>
  );
}