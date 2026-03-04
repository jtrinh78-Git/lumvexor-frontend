// SECTION: Imports
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

// SECTION: Types
type AuthState = {
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null;
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] | null;
  userId: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

// SECTION: Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthState["session"]>(null);
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const nextSession = data.session ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setUserId(nextSession?.user?.id ?? null);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const nextSession = newSession ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setUserId(nextSession?.user?.id ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, user, userId, loading }), [session, user, userId, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// SECTION: Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}