import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadTerritoryState, saveTerritoryState } from "./storage";
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

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function addDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

// SECTION: API
type TerritoryApi = {
  state: TerritoryState;

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
  const [state, setState] = useState<TerritoryState>(() => loadTerritoryState());

  useEffect(() => {
    saveTerritoryState(state);
  }, [state]);

  const api = useMemo<TerritoryApi>(() => {
    return {
      state,

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
          updatedAt: nowIso(),
        };

        setState((prev) => ({
          ...prev,
          addresses: [created, ...prev.addresses],
        }));

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

        const cooldownDays =
          input.cooldownDays ?? (input.outcome === "declined" ? 30 : 14);
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

        return created;
      },

      startPreviewCycle(input) {
        const expiresInHours = input.expiresInHours ?? 48;

        const created: PreviewCycle = {
          id: id("cycle"),
          addressId: input.addressId,
          agentId: input.agentId,
          previewCount: 0,
          expiresAt: new Date(
            Date.now() + expiresInHours * 60 * 60 * 1000
          ).toISOString(),
          isArchived: false,
          createdAt: nowIso(),
        };

        setState((prev) => ({
          ...prev,
          previewCycles: [created, ...prev.previewCycles],
        }));

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

        setState((prev) => ({
          ...prev,
          printLogs: [created, ...prev.printLogs],
        }));

        return created;
      },

      resetDemo() {
        localStorage.removeItem("lvx_territory_state_v1");
        setState(loadTerritoryState());
      },
    };
  }, [state]);

  return (
    <TerritoryContext.Provider value={api}>
      {props.children}
    </TerritoryContext.Provider>
  );
}

// SECTION: Hook
export function useTerritory() {
  const ctx = useContext(TerritoryContext);
  if (!ctx) throw new Error("useTerritory must be used within <TerritoryProvider />");
  return ctx;
}