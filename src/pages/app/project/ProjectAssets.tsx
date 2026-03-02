import { useParams } from "react-router-dom";

// SECTION: ProjectAssets
export function ProjectAssets() {
  const { projectId } = useParams();

  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Assets</h2>

      <div className="lvx-card">
        <div className="lvx-card-title">Asset Library</div>
        <div className="lvx-muted">
          Uploads, logos, photos, before/after, brand kit — all lives here.
        </div>
        <div className="lvx-muted" style={{ marginTop: 10 }}>
          Project: <strong>{projectId}</strong>
        </div>
      </div>
    </div>
  );
}