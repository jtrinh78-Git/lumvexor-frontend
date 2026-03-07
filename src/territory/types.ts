// SECTION: Address + Visits
export type AddressStatus =
  | "new"
  | "contacted"
  | "declined"
  | "follow_up"
  | "active_client";

export type VisitOutcome =
  | "no_contact"
  | "owner_unavailable"
  | "declined"
  | "interested"
  | "closed";

export type Address = {
  id: string;
  businessId?: string;
  businessName: string;
  street: string;
  city: string;
  state: string;
  zip: string;

  status: AddressStatus;

  lastVisitAt?: string;
  lastAgentId?: string;
  cooldownUntil?: string;
  assignedAgentId?: string;
  createdAt: string;
  updatedAt: string;
};

export type VisitLog = {
  id: string;
  addressId: string;
  agentId: string;
  outcome: VisitOutcome;
  notes?: string;
  createdAt: string;
};

// SECTION: Preview Cycles + Prints
export type PreviewCycle = {
  id: string;
  addressId: string;
  agentId: string;
  previewCount: number; // max 3 per cycle
  expiresAt: string; // ISO
  isArchived: boolean;
  createdAt: string;
};

export type PrintLog = {
  id: string;
  addressId: string;
  previewCycleId: string;
  agentId: string;
  printCost: number; // default 6
  reprint: boolean;
  createdAt: string;
};

// SECTION: Preview Assets (Watermarked + Clean Recipe)
export type PreviewAssetKind = "post" | "flyer" | "before_after";

export type PreviewAsset = {
  id: string;
  addressId: string;
  previewCycleId: string;
  agentId: string;

  kind: PreviewAssetKind;

  // demo-only (safe to show/print)
  watermarkedRef: string;

  // server-side later (clean rendering instructions)
  cleanRecipeRef: string;

  // locked until payment
  cleanUnlocked: boolean;

  createdAt: string;
};

// SECTION: Territory State
export type TerritoryState = {
  addresses: Address[];
  visits: VisitLog[];
  previewCycles: PreviewCycle[];
  printLogs: PrintLog[];
  previewAssets: PreviewAsset[];
};