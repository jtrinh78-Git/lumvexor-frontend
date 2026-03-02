import { useParams } from "react-router-dom";

// SECTION: ProjectPreviews
export function ProjectPreviews() {
  const { projectId } = useParams();

  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Previews</h2>

      <div className="lvx-card">
        <div className="lvx-card-title">Demo Preview Rules (locked)</div>
        <ul className="lvx-list">
          <li>3 previews per address</li>
          <li>Watermarked</li>
          <li>48-hour expiration</li>
          <li>No export</li>
          <li>Admin override possible</li>
        </ul>

        <div className="lvx-muted" style={{ marginTop: 10 }}>
          Project: <strong>{projectId}</strong>
        </div>
      </div>
    </div>
  );
}