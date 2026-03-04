import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

// SECTION: types
type AppRole = "agent" | "manager" | "admin";

// SECTION: AppLayout
export function AppLayout() {
  const location = useLocation();

  const [loadingRole, setLoadingRole] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  const aliveRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadRole() {
      setLoadingRole(true);
      setRole(null);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (!aliveRef.current) return;

      if (authErr) {
        console.error("AppLayout getUser error:", authErr);
        setLoadingRole(false);
        return;
      }

      const uid = authData.user?.id ?? null;
      lastUserIdRef.current = uid;

      if (!uid) {
        setLoadingRole(false);
        return;
      }

      const thisUid = uid;

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", thisUid)
        .single();

      if (!aliveRef.current) return;

      // Ignore stale result if user changed mid-flight
      if (lastUserIdRef.current !== thisUid) return;

      if (error) {
        console.error("AppLayout profile fetch error:", error);
        setRole(null);
        setLoadingRole(false);
        return;
      }

      const nextRole = (data?.role ?? null) as AppRole | null;
      setRole(nextRole);
      setLoadingRole(false);
    }

    // Initial + on route changes (helps after login redirect)
    loadRole();

    // Also re-check on login/logout/refresh
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [location.pathname]);

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
            Role:{" "}
            <strong>{loadingRole ? "loading…" : role ? role : "unknown"}</strong>
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