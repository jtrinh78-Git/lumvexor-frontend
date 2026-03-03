import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type RequireRoleProps = {
  roles: string[];
  children: React.ReactNode;
};

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

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