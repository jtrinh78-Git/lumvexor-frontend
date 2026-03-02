import { NavLink, Outlet, useParams } from "react-router-dom";

// SECTION: ProjectLayout
export function ProjectLayout() {
  const { projectId } = useParams();

  return (
    <div className="lvx-project">
      <div className="lvx-project-header">
        <div>
          <div className="lvx-project-kicker">Project Workspace</div>
          <div className="lvx-project-title">Project: {projectId}</div>
        </div>

        <div className="lvx-project-tabs">
          <NavLink
            to={`/app/projects/${projectId}`}
            end
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Overview
          </NavLink>
          <NavLink
            to={`/app/projects/${projectId}/previews`}
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Previews
          </NavLink>
          <NavLink
            to={`/app/projects/${projectId}/assets`}
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Assets
          </NavLink>
          <NavLink
            to={`/app/projects/${projectId}/publishing`}
            className={({ isActive }) => `lvx-tab ${isActive ? "is-active" : ""}`}
          >
            Publishing
          </NavLink>
          <NavLink
            to={`/app/projects/${projectId}/settings`}
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