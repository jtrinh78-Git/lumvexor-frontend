import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type RequireRoleProps = {
  roles: string[];
  children: React.ReactNode;
};



export function RequireRole({ roles, children }: RequireRoleProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data && roles.includes(data.role)) {
        setAllowed(true);
      }

      setLoading(false);
    }

    checkRole();
  }, [roles]);

  if (loading) return null;

  if (!allowed) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}