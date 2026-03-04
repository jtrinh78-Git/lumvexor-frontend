import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

// SECTION: Component
export function RequireSession() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 600 }}>Loading…</div>
        <div style={{ opacity: 0.7, marginTop: 6 }}>Checking session.</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}