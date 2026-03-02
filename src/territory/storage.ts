import type { TerritoryState } from "./types";
import { DEMO_TERRITORY_STATE } from "./demoData";

// SECTION: storage keys
const KEY = "lvx_territory_state_v1";

// SECTION: load
export function loadTerritoryState(): TerritoryState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEMO_TERRITORY_STATE;
    const parsed = JSON.parse(raw) as TerritoryState;
    if (!parsed?.addresses || !parsed?.visits || !parsed?.previewCycles || !parsed?.printLogs) {
      return DEMO_TERRITORY_STATE;
    }
    return parsed;
  } catch {
    return DEMO_TERRITORY_STATE;
  }
}

// SECTION: save
export function saveTerritoryState(state: TerritoryState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}