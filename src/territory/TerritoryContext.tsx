import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthProvider";
import type {
  Address,
  AddressStatus,
  PreviewCycle,
  TerritoryState,
  VisitLog,
  VisitOutcome,
  PrintLog,
  PreviewAsset,
  PreviewAssetKind,
} from "./types";

// SECTION: helpers
function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  // Browser-safe UUID generator (matches uuid column type)
  return crypto.randomUUID();
}

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const EMPTY_STATE: TerritoryState = {
  addresses: [],
  visits: [],
  previewCycles: [],
  previewAssets: [],
  printLogs: [],
};

// SECTION: DB mappers (snake_case -> camelCase)
function mapAddressRow(r: any): Address {
  return {
    id: r.id,
    businessName: r.business_name,
    street: r.street,
    city: r.city,
    state: r.state,
    zip: r.zip,
    status: r.status,
    assignedAgentId: r.assigned_agent_id ?? undefined,
    lastVisitAt: r.last_visit_at ?? undefined,
    lastAgentId: r.last_agent_id ?? undefined,
    cooldownUntil: r.cooldown_until ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapVisitRow(r: any): VisitLog {
  // Assumption: territory_visits has outcome, notes, created_at
  return {
    id: r.id,
    addressId: r.address_id,
    agentId: r.agent_id,
    outcome: r.outcome,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

function mapCycleRow(r: any): PreviewCycle {
  return {
    id: r.id,
    addressId: r.address_id,
    agentId: r.agent_id,
    previewCount: r.preview_count ?? 0,
    expiresAt: r.expires_at,
    isArchived: !!r.is_archived,
    createdAt: r.created_at,
  };
}

function mapAssetRow(r: any): PreviewAsset {
  return {
    id: r.id,
    addressId: r.address_id,
    previewCycleId: r.preview_cycle_id,
    agentId: r.agent_id,
    kind: r.kind,
    watermarkedRef: r.watermarked_ref,
    cleanRecipeRef: r.clean_recipe_ref,
    cleanUnlocked: !!r.clean_unlocked,
    createdAt: r.created_at,
  };
}

function mapPrintRow(r: any): PrintLog {
  return {
    id: r.id,
    addressId: r.address_id,
    previewCycleId: r.preview_cycle_id,
    agentId: r.agent_id,
    // numeric in Postgres may arrive as string depending on client settings
    printCost: typeof r.print_cost === "number" ? r.print_cost : Number(r.print_cost ?? 0),
    reprint: !!r.reprint,
    createdAt: r.created_at,
  };
}



// SECTION: org resolver (session-authoritative)
async function resolveOrgIdForUser(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("user_id", userId)
    .single();

  if (error) throw error;

  const orgId = data?.active_org_id as string | null;
  if (!orgId) throw new Error("No active_org_id set for this user");

  return orgId;
}
// SECTION: API
type TerritoryApi = {
  state: TerritoryState;
  assignAddress: (input: { addressId: string; agentId: string }) => void;
  getAddress: (addressId: string) => Address | undefined;
  getVisitsForAddress: (addressId: string) => VisitLog[];
  getActiveCycleForAddress: (addressId: string) => PreviewCycle | undefined;

  getAssetsForCycle: (previewCycleId: string) => PreviewAsset[];
  getPrintsForCycle: (previewCycleId: string) => PrintLog[];

  createAddress: (input: {
    businessName: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  }) => Address;

  logVisit: (input: {
    addressId: string;
    agentId: string;
    outcome: VisitOutcome;
    notes?: string;
    cooldownDays?: number;
  }) => VisitLog;

  startPreviewCycle: (input: {
    addressId: string;
    agentId: string;
    expiresInHours?: number; // default 48
  }) => PreviewCycle;

  incrementPreviewCount: (cycleId: string) => PreviewCycle | undefined;

  createPreviewAsset: (input: {
    addressId: string;
    previewCycleId: string;
    agentId: string;
    kind: PreviewAssetKind;
  }) => PreviewAsset | undefined;

  logPrint: (input: {
    addressId: string;
    previewCycleId: string;
    agentId: string;
    printCost?: number; // default 6
    reprint?: boolean;
  }) => PrintLog;

  resetDemo: () => void;
};

const TerritoryContext = createContext<TerritoryApi | null>(null);

// SECTION: Provider
export function TerritoryProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<TerritoryState>(EMPTY_STATE);

   const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;
  const orgIdRef = useRef<string | null>(null);
  async function ensureOrgId(): Promise<string> {
    if (!userId) throw new Error("Not authenticated");
    if (orgIdRef.current) return orgIdRef.current;

    const orgId = await resolveOrgIdForUser(userId);
    orgIdRef.current = orgId;
    return orgId;
  }
  

  async function hydrateFromSupabase() {
    try {
      const orgId = await ensureOrgId();

      const [addrRes, visitRes, cycleRes, assetRes, printRes] = await Promise.all([
        supabase.from("territory_addresses").select("*").eq("org_id", orgId),
        supabase.from("territory_visits").select("*").eq("org_id", orgId),
        supabase.from("preview_cycles").select("*").eq("org_id", orgId),
        supabase.from("preview_assets").select("*").eq("org_id", orgId),
        supabase.from("print_logs").select("*").eq("org_id", orgId),
      ]);

      for (const r of [addrRes, visitRes, cycleRes, assetRes, printRes]) {
        if (r.error) throw r.error;
      }

      setState({
        addresses: (addrRes.data ?? []).map(mapAddressRow),
        visits: (visitRes.data ?? []).map(mapVisitRow),
        previewCycles: (cycleRes.data ?? []).map(mapCycleRow),
        previewAssets: (assetRes.data ?? []).map(mapAssetRow),
        printLogs: (printRes.data ?? []).map(mapPrintRow),
      });
    } catch (e) {
      console.error("Territory hydrate failed:", e);
    }
  }

    useEffect(() => {
    if (authLoading) return;

    // Logged out: clear cached org + reset state and do nothing.
    if (!userId) {
      orgIdRef.current = null;
      setState(EMPTY_STATE);
      return;
    }

    // Logged in: hydrate after session is confirmed.
    hydrateFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId]);

  const api = useMemo<TerritoryApi>(() => {
    return {
      state,

      assignAddress(input) {
        setState((prev) => ({
          ...prev,
          addresses: prev.addresses.map((a) => {
            if (a.id !== input.addressId) return a;
            return { ...a, assignedAgentId: input.agentId, updatedAt: nowIso() };
          }),
        }));

        (async () => {
          try {
            const orgId = await ensureOrgId();
            const { error } = await supabase
              .from("territory_addresses")
              .update({ assigned_agent_id: input.agentId, updated_at: nowIso() })
              .eq("org_id", orgId)
              .eq("id", input.addressId);
            if (error) throw error;
          } catch (e) {
            console.error("assignAddress sync failed:", e);
          }
        })();
      },

      getAddress(addressId) {
        return state.addresses.find((a) => a.id === addressId);
      },

      getVisitsForAddress(addressId) {
        return state.visits
          .filter((v) => v.addressId === addressId)
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      },

      getActiveCycleForAddress(addressId) {
        const now = Date.now();
        return state.previewCycles
          .filter((c) => c.addressId === addressId && !c.isArchived)
          .filter((c) => new Date(c.expiresAt).getTime() > now)
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
      },

      getAssetsForCycle(previewCycleId) {
        return state.previewAssets
          .filter((a) => a.previewCycleId === previewCycleId)
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      },

      getPrintsForCycle(previewCycleId) {
        return state.printLogs
          .filter((p) => p.previewCycleId === previewCycleId)
          .slice()
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      },

      createAddress(input) {
        const createdAt = nowIso();
        const created: Address = {
          id: uuid(),
          businessName: input.businessName.trim(),
          street: input.street.trim(),
          city: input.city.trim(),
          state: input.state.trim(),
          zip: input.zip.trim(),
          status: "new",
          createdAt,
          updatedAt: createdAt,
          assignedAgentId: undefined,
        };

        setState((prev) => ({ ...prev, addresses: [created, ...prev.addresses] }));

        (async () => {
          try {
            const orgId = await ensureOrgId();
            if (!userId) throw new Error("Not authenticated");
            const actorId = userId;

            const { error } = await supabase.from("territory_addresses").insert({
              id: created.id,
              org_id: orgId,
              business_name: created.businessName,
              street: created.street,
              city: created.city,
              state: created.state,
              zip: created.zip,
              status: created.status,
              assigned_agent_id: actorId, // sane default for multi-agent
              created_at: createdAt,
              updated_at: createdAt,
            });
            if (error) throw error;

            // reflect assigned_agent_id from DB default choice
            setState((prev) => ({
              ...prev,
              addresses: prev.addresses.map((a) =>
                a.id === created.id ? { ...a, assignedAgentId: actorId } : a
              ),
            }));
          } catch (e) {
            console.error("createAddress sync failed:", e);
          }
        })();

        return created;
      },

      logVisit(input) {
        const createdAt = nowIso();
        const created: VisitLog = {
          id: uuid(),
          addressId: input.addressId,
          agentId: input.agentId,
          outcome: input.outcome,
          notes: input.notes?.trim() || undefined,
          createdAt,
        };

        const statusMap: Record<VisitOutcome, AddressStatus> = {
          no_contact: "contacted",
          owner_unavailable: "follow_up",
          declined: "declined",
          interested: "follow_up",
          closed: "active_client",
        };

        const cooldownDays = input.cooldownDays ?? (input.outcome === "declined" ? 30 : 14);
        const cooldownUntil = addDaysIso(cooldownDays);
        const updatedAt = nowIso();

        setState((prev) => ({
          ...prev,
          visits: [created, ...prev.visits],
          addresses: prev.addresses.map((a) => {
            if (a.id !== input.addressId) return a;
            return {
              ...a,
              status: statusMap[input.outcome],
              lastVisitAt: createdAt,
              lastAgentId: input.agentId,
              cooldownUntil,
              updatedAt,
            };
          }),
        }));

        (async () => {
          try {
            const orgId = await ensureOrgId();

            // Assumption: territory_visits columns include outcome, notes, created_at
            const { error: visitErr } = await supabase.from("territory_visits").insert({
              id: created.id,
              org_id: orgId,
              address_id: created.addressId,
              agent_id: created.agentId,
              outcome: created.outcome,
              notes: created.notes ?? null,
              created_at: createdAt,
            });
            if (visitErr) throw visitErr;

            const { error: addrErr } = await supabase
              .from("territory_addresses")
              .update({
                status: statusMap[input.outcome],
                last_visit_at: createdAt,
                last_agent_id: input.agentId,
                cooldown_until: cooldownUntil,
                updated_at: updatedAt,
              })
              .eq("org_id", orgId)
              .eq("id", input.addressId);
            if (addrErr) throw addrErr;
          } catch (e) {
            console.error("logVisit sync failed:", e);
          }
        })();

        return created;
      },

      startPreviewCycle(input) {
        const expiresInHours = input.expiresInHours ?? 48;

        const createdAt = nowIso();
        const created: PreviewCycle = {
          id: uuid(),
          addressId: input.addressId,
          agentId: input.agentId,
          previewCount: 0,
          expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
          isArchived: false,
          createdAt,
        };

        setState((prev) => ({ ...prev, previewCycles: [created, ...prev.previewCycles] }));

        (async () => {
          try {
            const orgId = await ensureOrgId();
            const { error } = await supabase.from("preview_cycles").insert({
              id: created.id,
              org_id: orgId,
              address_id: created.addressId,
              agent_id: created.agentId,
              preview_count: created.previewCount,
              expires_at: created.expiresAt,
              is_archived: created.isArchived,
              created_at: createdAt,
            });
            if (error) throw error;
          } catch (e) {
            console.error("startPreviewCycle sync failed:", e);
          }
        })();

        return created;
      },

      incrementPreviewCount(cycleId) {
        let updated: PreviewCycle | undefined;

        setState((prev) => {
          const nextCycles = prev.previewCycles.map((c) => {
            if (c.id !== cycleId) return c;
            if (c.previewCount >= 3) return c;
            updated = { ...c, previewCount: c.previewCount + 1 };
            return updated;
          });

          return { ...prev, previewCycles: nextCycles };
        });

        if (updated) {
          (async () => {
            try {
              const orgId = await ensureOrgId();
              const { error } = await supabase
                .from("preview_cycles")
                .update({ preview_count: updated!.previewCount })
                .eq("org_id", orgId)
                .eq("id", updated!.id);
              if (error) throw error;
            } catch (e) {
              console.error("incrementPreviewCount sync failed:", e);
            }
          })();
        }

        return updated;
      },

      createPreviewAsset(input) {
        const cycle = state.previewCycles.find((c) => c.id === input.previewCycleId);
        if (!cycle) return undefined;

        // Enforce 3 previews per cycle (discipline)
        if (cycle.previewCount >= 3) return undefined;

        const createdAt = nowIso();
        const created: PreviewAsset = {
          id: uuid(),
          addressId: input.addressId,
          previewCycleId: input.previewCycleId,
          agentId: input.agentId,
          kind: input.kind,

          watermarkedRef: `wm://${input.addressId}/${input.previewCycleId}/${input.kind}/${Date.now()}`,
          cleanRecipeRef: `recipe://${input.addressId}/${input.previewCycleId}/${input.kind}`,
          cleanUnlocked: false,

          createdAt,
        };

        setState((prev) => ({
          ...prev,
          previewAssets: [created, ...prev.previewAssets],
          previewCycles: prev.previewCycles.map((c) => {
            if (c.id !== input.previewCycleId) return c;
            if (c.previewCount >= 3) return c;
            return { ...c, previewCount: c.previewCount + 1 };
          }),
        }));

        (async () => {
          try {
            const orgId = await ensureOrgId();

            const { error: assetErr } = await supabase.from("preview_assets").insert({
              id: created.id,
              org_id: orgId,
              address_id: created.addressId,
              preview_cycle_id: created.previewCycleId,
              agent_id: created.agentId,
              kind: created.kind,
              watermarked_ref: created.watermarkedRef,
              clean_recipe_ref: created.cleanRecipeRef,
              clean_unlocked: created.cleanUnlocked,
              created_at: createdAt,
            });
            if (assetErr) throw assetErr;

            // keep cycle preview_count in sync
            const nextCount = Math.min(3, (cycle.previewCount ?? 0) + 1);
            const { error: cycleErr } = await supabase
              .from("preview_cycles")
              .update({ preview_count: nextCount })
              .eq("org_id", orgId)
              .eq("id", input.previewCycleId);
            if (cycleErr) throw cycleErr;
          } catch (e) {
            console.error("createPreviewAsset sync failed:", e);
          }
        })();

        return created;
      },

      logPrint(input) {
        const createdAt = nowIso();
        const created: PrintLog = {
          id: uuid(),
          addressId: input.addressId,
          previewCycleId: input.previewCycleId,
          agentId: input.agentId,
          printCost: input.printCost ?? 6,
          reprint: input.reprint ?? false,
          createdAt,
        };

        setState((prev) => ({ ...prev, printLogs: [created, ...prev.printLogs] }));

        (async () => {
          try {
            const orgId = await ensureOrgId();
            const { error } = await supabase.from("print_logs").insert({
              id: created.id,
              org_id: orgId,
              address_id: created.addressId,
              preview_cycle_id: created.previewCycleId,
              agent_id: created.agentId,
              print_cost: created.printCost,
              reprint: created.reprint,
              created_at: createdAt,
            });
            if (error) throw error;
          } catch (e) {
            console.error("logPrint sync failed:", e);
          }
        })();

        return created;
      },

      resetDemo() {
        // Phase 5 direction: demo reset should NOT delete org data.
        // For now: local reset + rehydrate.
        setState(EMPTY_STATE);
        hydrateFromSupabase();
      },
    };
  }, [state]);

  return <TerritoryContext.Provider value={api}>{props.children}</TerritoryContext.Provider>;
}

// SECTION: Hook
export function useTerritory() {
  const ctx = useContext(TerritoryContext);
  if (!ctx) throw new Error("useTerritory must be used within <TerritoryProvider />");
  return ctx;
}