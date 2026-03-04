// SECTION: Imports
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useProfile } from "./ProfileProvider";

// SECTION: RequireWorkspace
export function RequireWorkspace() {
  const p = useProfile();
  const location = useLocation();

  if (p.loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 700 }}>Loading…</div>
        <div style={{ opacity: 0.7, marginTop: 6 }}>Validating workspace.</div>
      </div>
    );
  }

  if (p.blocked) {
    return <Navigate to="/app/blocked" replace state={{ from: location }} />;
  }

  if (!p.activeOrgId || !p.role) {
    return <Navigate to="/app/blocked" replace state={{ from: location }} />;
  }

  return <Outlet />;
}