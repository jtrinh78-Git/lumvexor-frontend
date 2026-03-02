

export function AppHome() {
  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Dashboard</h2>

      <div className="lvx-grid">
        <div className="lvx-card">
          <div className="lvx-card-title">Quick Start</div>
          <div className="lvx-muted">
            This is the dashboard shell. Next we’ll add real modules.
          </div>
        </div>

        <div className="lvx-card">
          <div className="lvx-card-title">Status</div>
          <ul className="lvx-list">
            <li>Router: ✅</li>
            <li>Layouts: ✅</li>
            <li>Sidebar: ✅</li>
            <li>Auth: ⏳ next</li>
          </ul>
        </div>

        <div className="lvx-card">
          <div className="lvx-card-title">Ideas</div>
          <div className="lvx-muted">
            Projects → Assets → Generated content → Before/After → Publishing.
          </div>
        </div>
      </div>
    </div>
  );
}