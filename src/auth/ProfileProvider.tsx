// SECTION: Imports
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

// SECTION: Types
export type AppRole = "agent" | "manager" | "admin";

type BlockReason = "NO_PROFILE" | "NO_ACTIVE_ORG" | "NOT_A_MEMBER" | "LOAD_ERROR";

type ProfileState = {
  loading: boolean;
  role: AppRole | null;
  activeOrgId: string | null;

  // Deterministic gating
  blocked: boolean;
  blockReason: BlockReason | null;
};

const ProfileContext = createContext<ProfileState | null>(null);

// SECTION: Provider
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { userId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<BlockReason | null>(null);

  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function load(uid: string) {
      // Deterministic reset
      setLoading(true);
      setRole(null);
      setActiveOrgId(null);
      setBlocked(false);
      setBlockReason(null);

      try {
        // 1) active org from profiles (org selection truth)
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("active_org_id")
          .eq("user_id", uid)
          .maybeSingle();

        if (!aliveRef.current) return;

        if (profileErr) {
          console.error("ProfileProvider: profiles lookup failed:", profileErr);
          setBlocked(true);
          setBlockReason("LOAD_ERROR");
          setLoading(false);
          return;
        }

        if (!profile) {
          setBlocked(true);
          setBlockReason("NO_PROFILE");
          setLoading(false);
          return;
        }

        const orgId = (profile.active_org_id ?? null) as string | null;

        // No fallback org allowed
        if (!orgId) {
          setBlocked(true);
          setBlockReason("NO_ACTIVE_ORG");
          setLoading(false);
          return;
        }

        // 2) validate membership + role from org_memberships (authority)
        const { data: membership, error: memberErr } = await supabase
          .from("org_memberships")
          .select("role")
          .eq("user_id", uid)
          .eq("org_id", orgId)
          .maybeSingle();

        if (!aliveRef.current) return;

        if (memberErr) {
          console.error("ProfileProvider: org_memberships lookup failed:", memberErr);
          // Deterministic: membership check failed => org is not trusted
          setActiveOrgId(null);
          setBlocked(true);
          setBlockReason("LOAD_ERROR");
          setLoading(false);
          return;
        }

        if (!membership?.role) {
          // Deterministic: NOT_A_MEMBER => org is not trusted
          setActiveOrgId(null);
          setRole(null);
          setBlocked(true);
          setBlockReason("NOT_A_MEMBER");
          setLoading(false);
          return;
        }

        // Success: org validated + role resolved
        setActiveOrgId(orgId);
        setRole((membership.role ?? null) as AppRole | null);
        setBlocked(false);
        setBlockReason(null);
        setLoading(false);
      } catch (e) {
        if (!aliveRef.current) return;
        console.error("ProfileProvider: load failed:", e);
        setActiveOrgId(null);
        setRole(null);
        setBlocked(true);
        setBlockReason("LOAD_ERROR");
        setLoading(false);
      }
    }

    if (authLoading) return;

    if (!userId) {
      setLoading(false);
      setRole(null);
      setActiveOrgId(null);
      setBlocked(false);
      setBlockReason(null);
      return;
    }

    load(userId);
  }, [userId, authLoading]);

  const value = useMemo<ProfileState>(
    () => ({ loading, role, activeOrgId, blocked, blockReason }),
    [loading, role, activeOrgId, blocked, blockReason]
  );

  // Deterministic rendering gate: no org UI until resolved
  if (authLoading || loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 700 }}>Loading…</div>
        <div style={{ opacity: 0.7, marginTop: 6 }}>Resolving role + active org membership.</div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div style={{ padding: 24, maxWidth: 760 }}>
        <div style={{ fontWeight: 800 }}>Workspace blocked</div>
        <div style={{ opacity: 0.8, marginTop: 10 }}>
          {blockReason === "NO_PROFILE" && "No profile row found for this user."}
          {blockReason === "NO_ACTIVE_ORG" && "No active_org_id set on profile. No fallback is allowed."}
          {blockReason === "NOT_A_MEMBER" && "active_org_id is not a valid membership for this user."}
          {blockReason === "LOAD_ERROR" && "Failed to load workspace truth from database."}
        </div>
      </div>
    );
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// SECTION: Hook
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider />");
  return ctx;
}