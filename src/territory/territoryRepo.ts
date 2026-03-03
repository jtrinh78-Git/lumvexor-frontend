import { SupabaseClient } from "@supabase/supabase-js";

export type TerritorySnapshot = {
  addresses: any[];
  visits: any[];
  previewCycles: any[];
  previewAssets: any[];
  printLogs: any[];
};

export async function fetchTerritorySnapshot(args: {
  supabase: SupabaseClient;
  orgId: string;
  projectId?: string | null;
}): Promise<TerritorySnapshot> {
  const { supabase, orgId, projectId } = args;

  const baseFilter = (q: any) => {
    q = q.eq("org_id", orgId);
    if (projectId) q = q.eq("project_id", projectId);
    return q;
  };

  const [addressesRes, visitsRes, cyclesRes, assetsRes, printsRes] = await Promise.all([
    baseFilter(supabase.from("territory_addresses").select("*").order("created_at", { ascending: true })),
    baseFilter(supabase.from("territory_visits").select("*").order("visited_at", { ascending: false })),
    baseFilter(supabase.from("preview_cycles").select("*").order("created_at", { ascending: false })),
    baseFilter(supabase.from("preview_assets").select("*").order("created_at", { ascending: false })),
    baseFilter(supabase.from("print_logs").select("*").order("printed_at", { ascending: false })),
  ]);

  for (const res of [addressesRes, visitsRes, cyclesRes, assetsRes, printsRes]) {
    if (res.error) throw res.error;
  }

  return {
    addresses: addressesRes.data ?? [],
    visits: visitsRes.data ?? [],
    previewCycles: cyclesRes.data ?? [],
    previewAssets: assetsRes.data ?? [],
    printLogs: printsRes.data ?? [],
  };
}

export async function insertTerritoryAddress(args: {
  supabase: SupabaseClient;
  orgId: string;
  projectId?: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    label?: string;
    notes?: string;
    lat?: number;
    lng?: number;
    // include any existing fields you already use
  };
}) {
  const { supabase, orgId, projectId, address } = args;

  const payload: any = { ...address, org_id: orgId };
  if (projectId) payload.project_id = projectId;

  const res = await supabase
    .from("territory_addresses")
    .insert(payload)
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data;
}

export async function insertTerritoryVisit(args: {
  supabase: SupabaseClient;
  orgId: string;
  projectId?: string | null;
  visit: {
    address_id: string;
    outcome?: string;
    notes?: string;
    status?: string;
    visited_at?: string; // optional; ideally DB default now()
  };
}) {
  const { supabase, orgId, projectId, visit } = args;

  const payload: any = { ...visit, org_id: orgId };
  if (projectId) payload.project_id = projectId;

  const res = await supabase
    .from("territory_visits")
    .insert(payload)
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data;
}

export async function insertPreviewCycle(args: {
  supabase: SupabaseClient;
  orgId: string;
  projectId?: string | null;
  cycle: {
    address_id: string;
    cycle_index?: number; // if you track 1..N
    status?: string;
    started_at?: string; // optional
  };
}) {
  const { supabase, orgId, projectId, cycle } = args;

  const payload: any = { ...cycle, org_id: orgId };
  if (projectId) payload.project_id = projectId;

  const res = await supabase
    .from("preview_cycles")
    .insert(payload)
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data;
}

export async function insertPreviewAsset(args: {
  supabase: SupabaseClient;
  orgId: string;
  projectId?: string | null;
  asset: {
    cycle_id: string;
    kind?: string; // "before"|"after"|"mock" etc.
    url: string;
    watermarked_url?: string;
    created_at?: string;
  };
}) {
  const { supabase, orgId, projectId, asset } = args;

  const payload: any = { ...asset, org_id: orgId };
  if (projectId) payload.project_id = projectId;

  const res = await supabase
    .from("preview_assets")
    .insert(payload)
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data;
}

export async function insertPrintLog(args: {
  supabase: SupabaseClient;
  orgId: string;
  projectId?: string | null;
  log: {
    address_id: string;
    cycle_id?: string | null;
    pages?: number;
    cost_cents?: number;
    printed_at?: string; // optional
    notes?: string;
  };
}) {
  const { supabase, orgId, projectId, log } = args;

  const payload: any = { ...log, org_id: orgId };
  if (projectId) payload.project_id = projectId;

  const res = await supabase
    .from("print_logs")
    .insert(payload)
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data;
}