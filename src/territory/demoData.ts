import type { TerritoryState } from "./types";

// SECTION: Demo Data
export const DEMO_TERRITORY_STATE: TerritoryState = {
  addresses: [
    {
      id: "addr-aurora-dentistry",
      businessName: "Aurora Dentistry",
      street: "1234 E Colfax Ave",
      city: "Aurora",
      state: "CO",
      zip: "80010",
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "addr-denver-auto",
      businessName: "Denver Auto",
      street: "850 Broadway",
      city: "Denver",
      state: "CO",
      zip: "80203",
      status: "follow_up",
      lastVisitAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
      lastAgentId: "agent-1",
      cooldownUntil: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "addr-salon-elevate",
      businessName: "Salon Elevate",
      street: "77 S Broadway",
      city: "Denver",
      state: "CO",
      zip: "80209",
      status: "contacted",
      lastVisitAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      lastAgentId: "agent-2",
      cooldownUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 23).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  visits: [],
  previewCycles: [],
  printLogs: [],
};