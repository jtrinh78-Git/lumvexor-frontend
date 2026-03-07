import { useNavigate } from "react-router-dom";
import { useProfile } from "../../auth/ProfileProvider";

// SECTION: AppSettings
export function AppSettings() {
  const navigate = useNavigate();
  const { role } = useProfile();

  const isOwnerOrAdmin = role === "admin";

  return (
    <div className="lvx-page">
      <h2 className="lvx-h2">Settings</h2>

      <div className="lvx-card">
        <div className="lvx-card-title">App Preferences</div>

        <div className="lvx-muted">
          Later: profile, billing, team, integrations.
        </div>
      </div>

      {isOwnerOrAdmin && (
        <div className="lvx-card">
          <div className="lvx-card-title">Infrastructure</div>

          <div className="lvx-muted">
            Owner controlled infrastructure modules.
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              className="lvx-button"
              onClick={() => navigate("/app/email-infrastructure")}
            >
              Email Infrastructure
            </button>
          </div>
        </div>
      )}
    </div>
  );
}