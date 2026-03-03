import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

// SECTION: Supabase client (self-contained)
function getSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !anon) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  return createClient(url, anon);
}

const supabase = getSupabase();

// SECTION: helpers
function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
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

// SECTION: DB mappers (snake_case <-> camelCase)
function mapAddressRow(r: any): Address {
  return {
    id: r.id,
    businessName: r.business_name,
    street: r.street,
    city: r.city,
    state: r.state,
    zip: r.zip,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    assignedAgentId: r.assigned_agent_id ?? undefined,
    lastVisitAt: r.last_visit_at ?? undefined,
    lastAgentId: r.last_agent_id ?? undefined,
    cooldownUntil: r.cooldown_until ?? undefined,
  };
}

function mapVisitRow(r: any): VisitLog {
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
    printCost: r.print_cost ?? 0,
    reprint: !!r.reprint,
    createdAt: r.created_at,
  };
}

// SECTION: org resolver
async function resolveOrgId(): Promise<string> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("id", userId)
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

  const orgIdRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  async function ensureOrgId(): Promise<string> {
    if (orgIdRef.current) return orgIdRef.current;
    const orgId = await resolveOrgId();
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

      hydratedRef.current = true;
    } catch (e) {
      console.error("Territory hydrate failed:", e);
      // Keep UI running with whatever local in-memory state exists.
    }
  }

  useEffect(() => {
    hydrateFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const created: Address = {
          id: id("addr"),
          businessName: input.businessName.trim(),
          street: input.street.trim(),
          city: input.city.trim(),
          state: input.state.trim(),
          zip: input.zip.trim(),
          status: "new",
          createdAt: nowIso(),
          assignedAgentId: "agent-1",
          updatedAt: nowIso(),
        };

        setState((prev) => ({ ...prev, addresses: [created, ...prev.addresses] }));

        (async () => {
          try {
            const orgId = await ensureOrgId();
            const { error } = await supabase.from("territory_addresses").insert({
              id: created.id,
              org_id: orgId,
              business_name: created.businessName,
              street: created.street,
              city: created.city,
              state: created.state,
              zip: created.zip,
              status: created.status,
              assigned_agent_id: created.assignedAgentId,
              created_at: created.createdAt,
              updated_at: created.updatedAt,
            });
            if (error) throw error;
          } catch (e) {
            console.error("createAddress sync failed:", e);
          }
        })();

        return created;
      },

      logVisit(input) {
        const created: VisitLog = {
          id: id("visit"),
          addressId: input.addressId,
          agentId: input.agentId,
          outcome: input.outcome,
          notes: input.notes?.trim() || undefined,
          createdAt: nowIso(),
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

        setState((prev) => ({
          ...prev,
          visits: [created, ...prev.visits],
          addresses: prev.addresses.map((a) => {
            if (a.id !== input.addressId) return a;
            return {
              ...a,
              status: statusMap[input.outcome],
              lastVisitAt: created.createdAt,
              lastAgentId: input.agentId,
              cooldownUntil,
              updatedAt: nowIso(),
            };
          }),
        }));

        (async () => {
          try {
            const orgId = await ensureOrgId();

            const { error: visitErr } = await supabase.from("territory_visits").insert({
              id: created.id,
              org_id: orgId,
              address_id: created.addressId,
              agent_id: created.agentId,
              outcome: created.outcome,
              notes: created.notes ?? null,
              created_at: created.createdAt,
            });
            if (visitErr) throw visitErr;

            const { error: addrErr } = await supabase
              .from("territory_addresses")
              .update({
                status: statusMap[input.outcome],
                last_visit_at: created.createdAt,
                last_agent_id: input.agentId,
                cooldown_until: cooldownUntil,
                updated_at: nowIso(),
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

        const created: PreviewCycle = {
          id: id("cycle"),
          addressId: input.addressId,
          agentId: input.agentId,
          previewCount: 0,
          expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
          isArchived: false,
          createdAt: nowIso(),
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
              created_at: created.createdAt,
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

        const created: PreviewAsset = {
          id: id("asset"),
          addressId: input.addressId,
          previewCycleId: input.previewCycleId,
          agentId: input.agentId,
          kind: input.kind,

          watermarkedRef: `wm://${input.addressId}/${input.previewCycleId}/${input.kind}/${Date.now()}`,
          cleanRecipeRef: `recipe://${input.addressId}/${input.previewCycleId}/${input.kind}`,
          cleanUnlocked: false,

          createdAt: nowIso(),
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
              created_at: created.createdAt,
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
        const created: PrintLog = {
          id: id("print"),
          addressId: input.addressId,
          previewCycleId: input.previewCycleId,
          agentId: input.agentId,
          printCost: input.printCost ?? 6,
          reprint: input.reprint ?? false,
          createdAt: nowIso(),
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
              created_at: created.createdAt,
            });
            if (error) throw error;
          } catch (e) {
            console.error("logPrint sync failed:", e);
          }
        })();

        return created;
      },

      resetDemo() {
        // Phase 5 goal says: remove demo reset or make admin-only.
        // For now: local-only reset + re-hydrate (does NOT delete org data).
        setState(EMPTY_STATE);

        if (hydratedRef.current) {
          hydrateFromSupabase();
        }
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