import { Link } from "react-router-dom";

// SECTION: AppProjects
export function AppProjects() {
  const demoProjects = [
    { id: "demo-aurora-dentistry", name: "Aurora Dentistry" },
    { id: "demo-denver-auto", name: "Denver Auto" },
    { id: "demo-salon-elevate", name: "Salon Elevate" },
  ];

  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Projects</h2>

      <div className="lvx-card">
        <div className="lvx-card-title">Demo Workspaces</div>
        <div className="lvx-muted">
          Select a project to enter its workspace.
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {demoProjects.map((p) => (
            <Link key={p.id} to={`/app/projects/${p.id}`} className="lvx-rowlink">
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div className="lvx-muted">{p.id}</div>
              </div>
              <div className="lvx-muted">Open →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}