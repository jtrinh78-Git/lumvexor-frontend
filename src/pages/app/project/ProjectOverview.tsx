// SECTION: Imports
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card, CardBody, CardTitle } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useAuth } from "../../../auth/AuthProvider";
import { useTerritory } from "../../../territory/TerritoryContext";
import type { VisitOutcome } from "../../../territory/types";

// SECTION: ProjectOverview
export function ProjectOverview() {
  const { projectId } = useParams();
  const t = useTerritory();
  const { userId } = useAuth();

  const addressId = projectId || "";
  const address = addressId ? t.getAddress(addressId) : undefined;

  // Deterministic: agentId is authenticated user UUID
  const agentId = userId ?? "";
  const isAssigned = !!agentId && !!address?.assignedAgentId && address.assignedAgentId === agentId;

  const [outcome, setOutcome] = useState<VisitOutcome>("owner_unavailable");
  const [notes, setNotes] = useState("");

  const visits = useMemo(() => (addressId ? t.getVisitsForAddress(addressId) : []), [addressId, t]);

  const activeCycle = useMemo(
    () => (addressId ? t.getActiveCycleForAddress(addressId) : undefined),
    [addressId, t]
  );

  const cooldownInfo = useMemo(() => {
    if (!address?.cooldownUntil) return { text: "No cooldown set", isActive: false };
    const until = new Date(address.cooldownUntil).getTime();
    const now = Date.now();
    const isActive = until > now;
    return {
      text: isActive
        ? `Cooldown active until ${new Date(address.cooldownUntil).toLocaleString()}`
        : `Cooldown ended on ${new Date(address.cooldownUntil).toLocaleString()}`,
      isActive,
    };
  }, [address?.cooldownUntil]);

  const actionsDisabled = !addressId || !agentId;

  return (
    <div className="lvx-page">
      <PageHeader
        title="Overview"
        subtitle="Visit intelligence, cooldown control, and cycle status."
        right={
          address ? (
            <Badge variant={address.status === "active_client" ? "accent" : "neutral"}>
              {address.status.replace("_", " ")}
            </Badge>
          ) : (
            <Badge variant="neutral">No Address</Badge>
          )
        }
      />

      <Card>
        <CardTitle>Workspace Status</CardTitle>
        <CardBody>
          <ul className="lvx-list">
            <li>
              Address: <strong>{address?.businessName ?? addressId}</strong>
            </li>

            <li>
              Assigned Agent:{" "}
              <span className="lvx-muted">{address?.assignedAgentId ?? "—"}</span>
            </li>

            <li>
              Access:{" "}
              {isAssigned ? (
                <Badge variant="accent">assigned</Badge>
              ) : (
                <Badge variant="neutral">not assigned</Badge>
              )}
            </li>

            <li>
              Cycle:{" "}
              {activeCycle ? (
                <>
                  <strong>{activeCycle.previewCount}/3</strong> • Expires{" "}
                  {new Date(activeCycle.expiresAt).toLocaleString()}
                </>
              ) : (
                <span className="lvx-muted">No active preview cycle</span>
              )}
            </li>

            <li>
              Cooldown:{" "}
              <span className={cooldownInfo.isActive ? "" : "lvx-muted"}>
                {cooldownInfo.text}
              </span>
            </li>

            <li>
              Last Agent:{" "}
              <span className="lvx-muted">{address?.lastAgentId ?? "—"}</span>
            </li>

            <li>
              Last Visit:{" "}
              <span className="lvx-muted">
                {address?.lastVisitAt ? new Date(address.lastVisitAt).toLocaleString() : "—"}
              </span>
            </li>
          </ul>

          {!agentId ? (
            <div className="lvx-muted" style={{ marginTop: 10 }}>
              Auth user not resolved yet. Actions are temporarily disabled.
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Log Visit</CardTitle>
        <CardBody>
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              }}
            >
              <label>
                <div className="lvx-muted" style={{ marginBottom: 6 }}>
                  Outcome
                </div>
                <select
                  className="lvx-input"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as VisitOutcome)}
                >
                  <option value="no_contact">No contact</option>
                  <option value="owner_unavailable">Owner unavailable</option>
                  <option value="declined">Declined</option>
                  <option value="interested">Interested</option>
                  <option value="closed">Closed</option>
                </select>
              </label>

              <label>
                <div className="lvx-muted" style={{ marginBottom: 6 }}>
                  Cooldown override (days)
                </div>
                <input
                  className="lvx-input"
                  type="number"
                  min={0}
                  placeholder="Leave blank for default"
                  onChange={() => {
                    // no-op: we keep this simple in MVP (defaults inside logVisit)
                  }}
                  disabled
                  title="MVP: defaults are enforced in Territory layer. Admin overrides later."
                />
              </label>
            </div>

            <label>
              <div className="lvx-muted" style={{ marginBottom: 6 }}>
                Notes
              </div>
              <textarea
                className="lvx-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Short factual notes (e.g., best time to reach owner, objections, staff name)."
                style={{ height: 90, paddingTop: 10 }}
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                variant="primary"
                disabled={actionsDisabled}
                onClick={() => {
                  if (!addressId || !agentId) return;
                  t.logVisit({
                    addressId,
                    agentId,
                    outcome,
                    notes: notes.trim() || undefined,
                  });
                  setNotes("");
                }}
              >
                Save Visit Log
              </Button>

              <Button
                variant="secondary"
                disabled={actionsDisabled || !!activeCycle}
                onClick={() => {
                  if (!addressId || !agentId) return;
                  if (activeCycle) return;
                  t.startPreviewCycle({ addressId, agentId, expiresInHours: 48 });
                }}
              >
                Start Preview Cycle (48h)
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setOutcome("owner_unavailable");
                  setNotes("");
                }}
              >
                Reset Form
              </Button>
            </div>

            <div className="lvx-muted">
              Defaults: <strong>declined → 30 days</strong>, others →{" "}
              <strong>14 days</strong>. Admin override comes later.
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Visit History</CardTitle>
        <CardBody>
          {visits.length === 0 ? (
            <div className="lvx-muted">No visit logs yet. Log the first attempt above.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {visits.map((v) => (
                <div key={v.id} className="lvx-rowlink">
                  <div>
                    <div style={{ fontWeight: 800 }}>{v.outcome.replace("_", " ")}</div>
                    <div className="lvx-muted">
                      Agent: {v.agentId} • {new Date(v.createdAt).toLocaleString()}
                    </div>
                    {v.notes ? <div className="lvx-muted">Notes: {v.notes}</div> : null}
                  </div>
                  <Badge variant="neutral">logged</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}