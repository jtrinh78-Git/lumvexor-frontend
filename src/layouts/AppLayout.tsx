import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

// SECTION: types
type AppRole = "agent" | "manager" | "admin";

// SECTION: AppLayout
export function AppLayout() {
  const [role, setRole] = useState<AppRole>("agent");

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) {
        setRole("agent");
        return;
      }

      const { data, error } = await supabase
  .from("profiles")
  .select("role")
  .eq("user_id", uid)
  .single();

console.log("PROFILE QUERY RESULT:", { data, error });

if (error) {
  console.error("Profile fetch error:", error);
  setRole("agent");
} else if (data?.role) {
  setRole(data.role as AppRole);
} else {
  setRole("agent");
}
    })();
  }, []);

  const isAdminAccess = role === "admin" || role === "manager";

  const navItems = useMemo(() => {
    const base = [
  { to: "/app", label: "Dashboard", end: true as const },
  { to: "/app/projects", label: "Projects" },
  ...(isAdminAccess ? [{ to: "/app/performance", label: "Performance" }] : []),
  { to: "/app/settings", label: "Settings" },
];

    if (isAdminAccess) {
      base.push({ to: "/app/admin/users", label: "Admin" });
    }

    return base;
  }, [isAdminAccess]);

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
              className={({ isActive }) => `lvx-navlink ${isActive ? "is-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="lvx-sidebar-footer">
          <div className="lvx-muted">
            Role: <strong>{role}</strong>
          </div>
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