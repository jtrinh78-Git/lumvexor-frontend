// SECTION: Imports
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

// SECTION: Types
type SessionType = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];
type NonNullSession = NonNullable<SessionType>;

type AuthState = {
  session: SessionType | null;
  user: NonNullSession["user"] | null;
  userId: string | null;
  isAuthed: boolean;
  loading: boolean; // true until first getSession completes
};

const AuthContext = createContext<AuthState | null>(null);

// SECTION: Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionType | null>(null);
  const [loading, setLoading] = useState(true);

  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        console.error("AuthProvider getSession error:", error);
      }

      setSession(data.session ?? null);
      initializedRef.current = true;
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);

      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => {
    const user = session?.user ?? null;
    const userId = user?.id ?? null;

    return {
      session,
      user,
      userId,
      isAuthed: !!userId,
      loading,
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// SECTION: Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}