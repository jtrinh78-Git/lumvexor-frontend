import { Navigate } from "react-router-dom";
import { useProfile } from "../auth/ProfileProvider";

type RequireRoleProps = {
  roles: string[];
  children: React.ReactNode;
};

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { loading, role } = useProfile();

  if (loading) return null;

  if (!role || !roles.includes(role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}