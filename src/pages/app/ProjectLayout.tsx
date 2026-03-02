import { NavLink, Outlet, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { useTerritory } from "../../territory/TerritoryContext";

// SECTION: ProjectLayout
export function ProjectLayout() {
  const { projectId } = useParams();
  const t = useTerritory();

  const addressId = projectId || "";
  const address = addressId ? t.getAddress(addressId) : undefined;

  return (
    <div className="lvx-project">
      <div className="lvx-project-header">
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="lvx-project-kicker">Address Workspace</div>
            <div className="lvx-project-title">
              {address?.businessName ?? `Address: ${addressId}`}
            </div>
            {address ? (
              <div className="lvx-muted" style={{ marginTop: 6 }}>
                {address.street}, {address.city}, {address.state} {address.zip}
              </div>
            ) : null}
          </div>

          {address ? (
            <Badge variant={address.status === "active_client" ? "accent" : "neutral"}>
              {address.status.replace("_", " ")}
            </Badge>
          ) : null}
        </div>

        <div className="lvx-project-tabs">
          <NavLink
            to={`/app/projects/${addressId}`}
            end
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Overview
          </NavLink>
          <NavLink
            to={`/app/projects/${addressId}/previews`}
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Previews
          </NavLink>
          <NavLink
            to={`/app/projects/${addressId}/assets`}
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Assets
          </NavLink>
          <NavLink
            to={`/app/projects/${addressId}/publishing`}
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Publishing
          </NavLink>
          <NavLink
            to={`/app/projects/${addressId}/settings`}
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Settings
          </NavLink>
        </div>
      </div>

      <div className="lvx-project-body">
        <Outlet />
      </div>
    </div>
  );
}