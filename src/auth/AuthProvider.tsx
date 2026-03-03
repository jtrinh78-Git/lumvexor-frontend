// SECTION: Imports
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

// SECTION: Types
type AuthState = {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null;
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

// SECTION: Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthState["session"]>(null);
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, user, loading }), [session, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// SECTION: Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}