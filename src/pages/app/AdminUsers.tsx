import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

// SECTION: types
type AppRole = "agent" | "manager" | "admin";

type ProfileRow = {
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
  const [myRole, setMyRole] = useState<AppRole>("agent");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditOpenFor, setAuditOpenFor] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const isAdminAccess = myRole === "admin" || myRole === "manager";

  // SECTION: load my role
  useEffect(() => {
    (async () => {
      setError(null);
      setLoading(true);

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        setError(authErr.message);
        setLoading(false);
        return;
      }

      const uid = authData.user?.id;
      if (!uid) {
        setMyRole("agent");
        setLoading(false);
        return;
      }

      const { data, error: roleErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", uid)
        .single();

      if (roleErr) {
        setError(roleErr.message);
        setMyRole("agent");
        setLoading(false);
        return;
      }

      setMyRole((data?.role as AppRole) || "agent");
      setLoading(false);
    })();
  }, []);

  // SECTION: load profiles
  const fetchProfiles = async () => {
    setError(null);
    const query = supabase
      .from("profiles")
      .select("user_id,email,full_name,role,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const trimmed = q.trim();
    const finalQuery =
      trimmed.length > 0
        ? query.or(`email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
        : query;

    const { data, error: e } = await finalQuery;
    if (e) {
      setError(e.message);
      return;
    }
    setProfiles((data as ProfileRow[]) || []);
  };

  useEffect(() => {
    if (!isAdminAccess) return;
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminAccess]);

  const filteredCount = useMemo(() => profiles.length, [profiles]);

  // SECTION: role update
  const setRole = async (userId: string, nextRole: AppRole) => {
    setSavingUserId(userId);
    setError(null);

    const { error: e } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("user_id", userId);

    if (e) {
      setError(e.message);
      setSavingUserId(null);
      return;
    }

    await fetchProfiles();
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

  if (loading) {
    return (
      <div className="lvx-page">
        <PageHeader title="Admin" subtitle="Loading…" right={<Badge variant="neutral">role</Badge>} />
      </div>
    );
  }

  if (!isAdminAccess) {
    return (
      <div className="lvx-page">
        <PageHeader
          title="Admin"
          subtitle="Access restricted. Admin/Manager only."
          right={<Badge variant="neutral">{myRole}</Badge>}
        />

        <Card>
          <CardTitle>Restricted</CardTitle>
          <CardBody>
            <div className="lvx-muted">
              Your role is <strong>{myRole}</strong>. This page is only available to Admin/Manager.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to="/app">
                <Button variant="secondary">Back to Dashboard</Button>
              </Link>
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
        right={<Badge variant="accent">{myRole}</Badge>}
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
            <Button variant="primary" onClick={fetchProfiles}>
              Search
            </Button>
            <div className="lvx-muted">{filteredCount} result(s)</div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Users</CardTitle>
        <CardBody>
          {profiles.length === 0 ? (
            <div className="lvx-muted">No profiles found.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {profiles.map((p) => (
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
                              {new Date(a.created_at).toLocaleString()} •{" "}
                              <strong>{a.old_role ?? "—"}</strong> → <strong>{a.new_role}</strong>{" "}
                              • actor: {a.actor_user_id ?? "—"}
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