// SECTION: Types
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
  businessName: string;
  street: string;
  city: string;
  state: string;
  zip: string;

  status: AddressStatus;

  lastVisitAt?: string;
  lastAgentId?: string;

  cooldownUntil?: string;

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

export type TerritoryState = {
  addresses: Address[];
  visits: VisitLog[];
  previewCycles: PreviewCycle[];
  printLogs: PrintLog[];
};