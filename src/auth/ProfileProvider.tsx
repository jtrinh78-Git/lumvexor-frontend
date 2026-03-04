// SECTION: Imports
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

// SECTION: Types
export type AppRole = "agent" | "manager" | "admin";

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

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function load(uid: string) {
      setLoading(true);
      setRole(null);
      setActiveOrgId(null);

      // 1) active org from profiles (org selection)
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("active_org_id")
        .eq("user_id", uid)
        .single();

      if (!aliveRef.current) return;

      if (profileErr) {
        console.error("ProfileProvider: profiles lookup failed:", profileErr);
        setLoading(false);
        return;
      }

      const orgId = (profile?.active_org_id ?? null) as string | null;
      setActiveOrgId(orgId);

      if (!orgId) {
        setLoading(false);
        return;
      }

      // 2) role from org_memberships (authority)
      const { data: membership, error: memberErr } = await supabase
        .from("org_memberships")
        .select("role")
        .eq("user_id", uid)
        .eq("org_id", orgId)
        .single();

      if (!aliveRef.current) return;

      if (memberErr) {
        console.error("ProfileProvider: org_memberships lookup failed:", memberErr);
        setLoading(false);
        return;
      }

      setRole((membership?.role ?? null) as AppRole | null);
      setLoading(false);
    }

    if (authLoading) return;

    if (!userId) {
      setLoading(false);
      setRole(null);
      setActiveOrgId(null);
      return;
    }

    load(userId);
  }, [userId, authLoading]);

  const value = useMemo<ProfileState>(() => ({ loading, role, activeOrgId }), [loading, role, activeOrgId]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// SECTION: Hook
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider />");
  return ctx;
}