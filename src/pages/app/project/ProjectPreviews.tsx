import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Card, CardBody, CardTitle } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useTerritory } from "../../../territory/TerritoryContext";

// SECTION: ProjectPreviews
export function ProjectPreviews() {
  const { projectId } = useParams();
  const t = useTerritory();

  const addressId = projectId || "";
  const address = addressId ? t.getAddress(addressId) : undefined;

  // In MVP we use a stable demo agent id
  const agentId = "agent-1";

  const activeCycle = addressId ? t.getActiveCycleForAddress(addressId) : undefined;

  const assets = useMemo(
    () => (activeCycle ? t.getAssetsForCycle(activeCycle.id) : []),
    [activeCycle, t]
  );

  const prints = useMemo(
    () => (activeCycle ? t.getPrintsForCycle(activeCycle.id) : []),
    [activeCycle, t]
  );

  return (
    <div className="lvx-page">
      <PageHeader
        title="Previews"
        subtitle="Watermarked demo assets + locked clean recipes. Clean unlock happens only after payment."
        right={
          activeCycle ? (
            <Badge variant="neutral">
              Cycle: {activeCycle.previewCount}/3 • Expires{" "}
              {new Date(activeCycle.expiresAt).toLocaleString()}
            </Badge>
          ) : (
            <Badge variant="neutral">No Active Cycle</Badge>
          )
        }
      />

      <Card>
        <CardTitle>Rules</CardTitle>
        <CardBody>
          <ul className="lvx-list">
            <li>Max 3 previews per cycle</li>
            <li>Watermarked only pre-payment</li>
            <li>Clean assets are recipes only (server-rendered after payment)</li>
            <li>Cycle expires (default 48 hours)</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Actions</CardTitle>
        <CardBody>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              variant="primary"
              onClick={() => {
                if (!addressId) return;

                if (!activeCycle) {
                  t.startPreviewCycle({ addressId, agentId, expiresInHours: 48 });
                  return;
                }

                t.createPreviewAsset({
                  addressId,
                  previewCycleId: activeCycle.id,
                  agentId,
                  kind: "post",
                });
              }}
              disabled={!addressId}
            >
              {activeCycle ? "Generate Preview (Post)" : "Start 48h Cycle"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                if (!addressId || !activeCycle) return;

                t.createPreviewAsset({
                  addressId,
                  previewCycleId: activeCycle.id,
                  agentId,
                  kind: "flyer",
                });
              }}
              disabled={!activeCycle || (activeCycle?.previewCount ?? 0) >= 3}
            >
              Generate Preview (Flyer)
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                if (!addressId || !activeCycle) return;

                t.createPreviewAsset({
                  addressId,
                  previewCycleId: activeCycle.id,
                  agentId,
                  kind: "before_after",
                });
              }}
              disabled={!activeCycle || (activeCycle?.previewCount ?? 0) >= 3}
            >
              Generate Preview (Before/After)
            </Button>

            <Button
              variant="primary"
              onClick={() => {
                if (!addressId || !activeCycle) return;

                const currentAssets = t.getAssetsForCycle(activeCycle.id);
                if (currentAssets.length === 0) return;

                t.logPrint({
                  addressId,
                  previewCycleId: activeCycle.id,
                  agentId,
                  printCost: 6,
                  reprint: false,
                });

                alert("Logged print (watermarked package).");
              }}
              disabled={!activeCycle || assets.length === 0}
            >
              Print Watermarked Package ($6)
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                if (!addressId || !activeCycle) return;

                const currentAssets = t.getAssetsForCycle(activeCycle.id);
                if (currentAssets.length === 0) return;

                t.logPrint({
                  addressId,
                  previewCycleId: activeCycle.id,
                  agentId,
                  printCost: 6,
                  reprint: true,
                });

                alert("Logged reprint (watermarked package).");
              }}
              disabled={!activeCycle || assets.length === 0}
            >
              Reprint Existing Package
            </Button>

            <Button variant="ghost" disabled>
              Unlock Clean (Payment Required)
            </Button>
          </div>

          <div className="lvx-muted" style={{ marginTop: 10 }}>
            Address: <strong>{address?.businessName ?? addressId}</strong>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Generated Assets (Watermarked)</CardTitle>
        <CardBody>
          {assets.length === 0 ? (
            <div className="lvx-muted">
              No assets yet. Start a cycle, then generate up to 3 previews.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {assets.map((a) => (
                <div key={a.id} className="lvx-rowlink">
                  <div>
                    <div style={{ fontWeight: 800 }}>{a.kind}</div>
                    <div className="lvx-muted">Watermarked: {a.watermarkedRef}</div>
                    <div className="lvx-muted">
                      Clean recipe (locked): {a.cleanRecipeRef}
                    </div>
                  </div>
                  <Badge variant="neutral">{a.cleanUnlocked ? "unlocked" : "locked"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Print History</CardTitle>
        <CardBody>
          {!activeCycle ? (
            <div className="lvx-muted">Start a cycle to enable printing.</div>
          ) : prints.length === 0 ? (
            <div className="lvx-muted">No prints logged yet for this cycle.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {prints.map((p) => (
                <div key={p.id} className="lvx-rowlink">
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {p.reprint ? "Reprint" : "Print"} • ${p.printCost.toFixed(2)}
                    </div>
                    <div className="lvx-muted">
                      Agent: {p.agentId} • {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="neutral">{p.reprint ? "reprint" : "first"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}