
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/app", label: "Dashboard", end: true },
  { to: "/app/projects", label: "Projects" },
  { to: "/app/settings", label: "Settings" },
];

export function AppLayout() {
  return (
    <div className="lvx-app">
      <aside className="lvx-sidebar">
        <div className="lvx-brand">
          <div className="lvx-logo" />
          <div>
            <div className="lvx-brand-name">Lumvexor</div>
            <div className="lvx-brand-sub">App Shell</div>
          </div>
        </div>

        <nav className="lvx-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `lvx-navlink ${isActive ? "is-active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="lvx-sidebar-footer">
          <div className="lvx-muted">Auth comes next.</div>
        </div>
      </aside>

      <main className="lvx-main">
        <header className="lvx-topbar">
          <div className="lvx-topbar-title">Lumvexor</div>
          <div className="lvx-topbar-right">
            <span className="lvx-pill">Production baseline</span>
          </div>
        </header>

        <div className="lvx-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}