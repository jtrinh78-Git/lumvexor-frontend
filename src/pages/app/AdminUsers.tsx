// SECTION: Imports
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../auth/ProfileProvider";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

// SECTION: types
type AppRole = "agent" | "manager" | "admin";

type ProfileIdentityRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

type MembershipRow = {
  user_id: string;
  role: AppRole;
};

type UiRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  created_at: string;
};

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string;
  old_role: string | null;
  new_role: string;
  created_at: string;
};

// SECTION: AdminUsers
export function AdminUsers() {
  const profile = useProfile();

  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UiRow[]>([]);

  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditOpenFor, setAuditOpenFor] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // SECTION: load users
  const fetchUsers = async () => {
    if (!profile.activeOrgId) return;

    setError(null);

    // 1) memberships (authoritative roles)
    const { data: members, error: memErr } = await supabase
      .from("org_memberships")
      .select("user_id, role")
      .eq("org_id", profile.activeOrgId)
      .limit(200);

    if (memErr) {
      setError(memErr.message);
      setRows([]);
      return;
    }

    const memberships = ((members ?? []) as MembershipRow[]).filter((m) => !!m.user_id);
    const ids = memberships.map((m) => m.user_id);

    if (ids.length === 0) {
      setRows([]);
      return;
    }

    // 2) profiles (identity)
    const base = supabase
      .from("profiles")
      .select("user_id,email,full_name,created_at")
      .in("user_id", ids);

    const trimmed = q.trim();
    const profQuery =
      trimmed.length > 0
        ? base.or(`email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
        : base;

    const { data: profs, error: profErr } = await profQuery;

    if (profErr) {
      setError(profErr.message);
      setRows([]);
      return;
    }

    const profiles = (profs ?? []) as ProfileIdentityRow[];

    const profMap = new Map<string, ProfileIdentityRow>();
    for (const p of profiles) profMap.set(p.user_id, p);

    // 3) merge (membership role + profile identity)
    const merged: UiRow[] = memberships
      .map((m) => {
        const p = profMap.get(m.user_id);
        return {
          user_id: m.user_id,
          role: m.role,
          email: p?.email ?? null,
          full_name: p?.full_name ?? null,
          created_at: p?.created_at ?? new Date(0).toISOString(),
        };
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    setRows(merged);
  };

  useEffect(() => {
    if (profile.loading) return;
    if (!profile.activeOrgId || !profile.role) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.loading, profile.activeOrgId, profile.role]);

  const filteredCount = useMemo(() => rows.length, [rows]);

  // SECTION: role update
  const setRole = async (userId: string, nextRole: AppRole) => {
    if (!profile.activeOrgId) return;

    setSavingUserId(userId);
    setError(null);

    const { error: updateErr } = await supabase
      .from("org_memberships")
      .update({ role: nextRole })
      .eq("user_id", userId)
      .eq("org_id", profile.activeOrgId);

    if (updateErr) {
      setError(updateErr.message);
      setSavingUserId(null);
      return;
    }

    await fetchUsers();
    setSavingUserId(null);
  };

  // SECTION: audit fetch
  const toggleAudit = async (targetUserId: string) => {
    if (auditOpenFor === targetUserId) {
      setAuditOpenFor(null);
      setAudit([]);
      return;
    }

    setAuditOpenFor(targetUserId);
    setAudit([]);
    setAuditLoading(true);
    setError(null);

    const { data, error: e } = await supabase
      .from("role_change_audit")
      .select("id,actor_user_id,target_user_id,old_role,new_role,created_at")
      .eq("target_user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(25);

    setAuditLoading(false);

    if (e) {
      setError(e.message);
      return;
    }

    setAudit((data as AuditRow[]) || []);
  };

  if (profile.loading) {
    return (
      <div className="lvx-page">
        <PageHeader title="Admin Users" subtitle="Loading workspace…" right={<Badge variant="neutral">…</Badge>} />
      </div>
    );
  }

  // RequireRole should gate this route. This is a deterministic fallback.
  if (profile.role !== "admin") {
    return (
      <div className="lvx-page">
        <PageHeader title="Admin" subtitle="Access restricted. Admin only." right={<Badge variant="neutral">{profile.role ?? "—"}</Badge>} />
        <Card>
          <CardTitle>Restricted</CardTitle>
          <CardBody>
            <div className="lvx-muted">
              Your role is <strong>{profile.role ?? "—"}</strong>. This page is only available to Admin.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="lvx-page">
      <PageHeader
        title="Admin Users"
        subtitle="Promote/demote roles. Every role change is audited."
        right={<Badge variant="accent">{profile.role}</Badge>}
      />

      {error ? (
        <Card>
          <CardTitle>System</CardTitle>
          <CardBody>
            <div className="lvx-muted">Error: {error}</div>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Search</CardTitle>
        <CardBody>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="lvx-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email or name…"
              style={{ minWidth: 260 }}
            />
            <Button variant="primary" onClick={fetchUsers}>
              Search
            </Button>
            <div className="lvx-muted">{filteredCount} result(s)</div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Users</CardTitle>
        <CardBody>
          {rows.length === 0 ? (
            <div className="lvx-muted">No users found in this org.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {rows.map((p) => (
                <div key={p.user_id} className="lvx-rowlink" style={{ alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {p.email ?? "(no email)"}{" "}
                      <span className="lvx-muted" style={{ fontWeight: 400 }}>
                        {p.full_name ? `• ${p.full_name}` : ""}
                      </span>
                    </div>
                    <div className="lvx-muted">
                      user_id: {p.user_id} • created {new Date(p.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Badge variant="neutral">{p.role}</Badge>

                    <select
                      className="lvx-input"
                      value={p.role}
                      onChange={(e) => setRole(p.user_id, e.target.value as AppRole)}
                      disabled={savingUserId === p.user_id}
                      style={{ width: 140 }}
                    >
                      <option value="agent">agent</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>

                    <Button
                      variant="secondary"
                      onClick={() => toggleAudit(p.user_id)}
                      disabled={auditLoading && auditOpenFor === p.user_id}
                    >
                      {auditOpenFor === p.user_id ? "Hide Audit" : "View Audit"}
                    </Button>
                  </div>

                  {auditOpenFor === p.user_id ? (
                    <div style={{ gridColumn: "1 / -1", marginTop: 10 }}>
                      {auditLoading ? (
                        <div className="lvx-muted">Loading audit…</div>
                      ) : audit.length === 0 ? (
                        <div className="lvx-muted">No role changes recorded.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {audit.map((a) => (
                            <div key={a.id} className="lvx-muted">
                              {new Date(a.created_at).toLocaleString()} • <strong>{a.old_role ?? "—"}</strong> →{" "}
                              <strong>{a.new_role}</strong> • actor: {a.actor_user_id ?? "—"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}