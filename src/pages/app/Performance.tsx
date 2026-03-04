// SECTION: Imports
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../auth/ProfileProvider";

// SECTION: Types
type MetricRow = {
  org_id: string;
  agent_id: string;

  visits_7d: number;
  closed_7d: number;
  close_rate_7d: number;

  visits_30d: number;
  closed_30d: number;
  close_rate_30d: number;

  previews_7d: number;
  previews_30d: number;

  prints_7d: number;
  print_cost_7d: number;

  prints_30d: number;
  print_cost_30d: number;

  active_clients: number;
};

// SECTION: Performance
export default function Performance() {
  const p = useProfile();

  const [rows, setRows] = useState<MetricRow[]>([]);
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load(orgId: string) {
      setError(null);

      try {
        const { data, error: viewErr } = await supabase
          .from("agent_metrics")
          .select("*")
          .eq("org_id", orgId);

        if (viewErr) throw viewErr;

        if (!mounted) return;
        setRows((data ?? []) as MetricRow[]);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load metrics");
        setRows([]);
      }
    }

    if (p.loading) return;

    // Deterministic gate: no org truth => no query
    if (!p.activeOrgId) {
      setRows([]);
      return;
    }

    load(p.activeOrgId);

    return () => {
      mounted = false;
    };
  }, [p.loading, p.activeOrgId]);

  const accessDenied = !p.loading && (p.role !== "admin" && p.role !== "manager");

  const leaderboard = useMemo(() => {
    const copy = rows.slice();
    if (range === "7d") copy.sort((a, b) => (b.visits_7d ?? 0) - (a.visits_7d ?? 0));
    else copy.sort((a, b) => (b.visits_30d ?? 0) - (a.visits_30d ?? 0));
    return copy;
  }, [rows, range]);

  const totals = useMemo(() => {
    const sum = (n: number) => (Number.isFinite(n) ? n : 0);
    return leaderboard.reduce(
      (acc, r) => {
        if (range === "7d") {
          acc.visits += sum(r.visits_7d);
          acc.closed += sum(r.closed_7d);
          acc.previews += sum(r.previews_7d);
          acc.prints += sum(r.prints_7d);
          acc.printCost += sum(r.print_cost_7d);
        } else {
          acc.visits += sum(r.visits_30d);
          acc.closed += sum(r.closed_30d);
          acc.previews += sum(r.previews_30d);
          acc.prints += sum(r.prints_30d);
          acc.printCost += sum(r.print_cost_30d);
        }
        acc.activeClients += sum(r.active_clients);
        return acc;
      },
      { visits: 0, closed: 0, previews: 0, prints: 0, printCost: 0, activeClients: 0 }
    );
  }, [leaderboard, range]);

  const closeRate = totals.visits === 0 ? 0 : Math.round((totals.closed / totals.visits) * 1000) / 10;

  if (p.loading) {
    return (
      <div className="space-y-4">
        <div className="border rounded-md p-3 text-sm">Loading workspace…</div>
      </div>
    );
  }

  // Router should already block this, but keep deterministic UI if reached.
  if (accessDenied) {
    return (
      <div className="space-y-4">
        <div className="border rounded-md p-3 text-sm">
          Access denied: manager/admin only.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Performance</h1>
          <div className="text-sm opacity-70">Org-wide metrics and agent leaderboard.</div>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-md border ${range === "7d" ? "opacity-100" : "opacity-60"}`}
            onClick={() => setRange("7d")}
          >
            7 days
          </button>
          <button
            className={`px-3 py-1 rounded-md border ${range === "30d" ? "opacity-100" : "opacity-60"}`}
            onClick={() => setRange("30d")}
          >
            30 days
          </button>
        </div>
      </div>

      {error && <div className="border rounded-md p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="border rounded-md p-3">
          <div className="text-xs opacity-70">Visits</div>
          <div className="text-2xl font-semibold">{totals.visits}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-xs opacity-70">Close rate</div>
          <div className="text-2xl font-semibold">{closeRate}%</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-xs opacity-70">Previews</div>
          <div className="text-2xl font-semibold">{totals.previews}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-xs opacity-70">Print cost</div>
          <div className="text-2xl font-semibold">${totals.printCost.toFixed(2)}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-xs opacity-70">Active clients</div>
          <div className="text-2xl font-semibold">{totals.activeClients}</div>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="p-3 border-b font-semibold">Leaderboard</div>
        <div className="divide-y">
          {leaderboard.map((r) => {
            const visits = range === "7d" ? r.visits_7d : r.visits_30d;
            const rate = range === "7d" ? r.close_rate_7d : r.close_rate_30d;
            const previews = range === "7d" ? r.previews_7d : r.previews_30d;
            const prints = range === "7d" ? r.prints_7d : r.prints_30d;
            const cost = range === "7d" ? r.print_cost_7d : r.print_cost_30d;

            return (
              <div key={r.agent_id} className="p-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.agent_id}</div>
                  <div className="text-xs opacity-70">Active clients: {r.active_clients}</div>
                </div>

                <div className="flex gap-6 text-sm">
                  <div>
                    Visits: <span className="font-semibold">{visits}</span>
                  </div>
                  <div>
                    Close: <span className="font-semibold">{rate}%</span>
                  </div>
                  <div>
                    Previews: <span className="font-semibold">{previews}</span>
                  </div>
                  <div>
                    Prints: <span className="font-semibold">{prints}</span>
                  </div>
                  <div>
                    Cost: <span className="font-semibold">${Number(cost).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {leaderboard.length === 0 && <div className="p-3 text-sm opacity-70">No metrics yet.</div>}
        </div>
      </div>
    </div>
  );
}