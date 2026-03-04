import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

// SECTION: types
type AppRole = "agent" | "manager" | "admin";

type ProfileState = {
  loading: boolean;
  role: AppRole | null;
  activeOrgId: string | null;
};

const ProfileContext = createContext<ProfileState | null>(null);

// SECTION: Provider
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { userId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const aliveRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadProfile(uid: string) {
      setLoading(true);
      setRole(null);
      setActiveOrgId(null);

      lastUserIdRef.current = uid;

      const { data, error } = await supabase
        .from("profiles")
        .select("role, active_org_id")
        .eq("user_id", uid)
        .single();

      if (!aliveRef.current) return;
      if (lastUserIdRef.current !== uid) return;

      if (error) {
        console.error("ProfileProvider profile query error:", error);
        setLoading(false);
        return;
      }

      setRole((data?.role ?? null) as AppRole | null);
      setActiveOrgId((data?.active_org_id ?? null) as string | null);
      setLoading(false);
    }

    // Wait for auth to resolve first
    if (authLoading) {
      setLoading(true);
      setRole(null);
      setActiveOrgId(null);
      return;
    }

    if (!userId) {
      setLoading(false);
      setRole(null);
      setActiveOrgId(null);
      return;
    }

    loadProfile(userId);
  }, [userId, authLoading]);

  const value = useMemo<ProfileState>(
    () => ({ loading, role, activeOrgId }),
    [loading, role, activeOrgId]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// SECTION: Hook
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider />");
  return ctx;
}