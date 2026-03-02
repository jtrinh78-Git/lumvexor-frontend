import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { useTerritory } from "../../territory/TerritoryContext";

// SECTION: AppProjects
export function AppProjects() {
  const t = useTerritory();

  const [businessName, setBusinessName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Denver");
  const [state, setState] = useState("CO");
  const [zip, setZip] = useState("");

  const addresses = useMemo(() => t.state.addresses, [t.state.addresses]);

  return (
    <div className="lvx-page">
      <PageHeader
        title="Territory"
        subtitle="Address records, visit history, preview cycles, and print tracking."
        right={
          <Button
            variant="ghost"
            onClick={() => t.resetDemo()}
            title="Reset local demo data"
          >
            Reset Demo
          </Button>
        }
      />

      <Card>
        <CardTitle>Create Address Record</CardTitle>
        <CardBody>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <input className="lvx-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" />
            <input className="lvx-input" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" />
            <input className="lvx-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <input className="lvx-input" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
            <input className="lvx-input" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Button
                variant="primary"
                disabled={!businessName.trim() || !street.trim()}
                onClick={() => {
                  const a = t.createAddress({ businessName, street, city, state, zip });
                  setBusinessName("");
                  setStreet("");
                  setZip("");
                  // Optionally route user to workspace by clicking the new record below.
                  console.log("Created address", a.id);
                }}
              >
                Create
              </Button>
              <span className="lvx-muted">Local-only. Supabase later.</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardTitle>Addresses</CardTitle>
        <CardBody>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {addresses.map((a) => (
              <Link key={a.id} to={`/app/projects/${a.id}`} className="lvx-rowlink">
                <div>
                  <div style={{ fontWeight: 800 }}>{a.businessName}</div>
                  <div className="lvx-muted">
                    {a.street}, {a.city}, {a.state} {a.zip}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge variant={a.status === "active_client" ? "accent" : "neutral"}>
                    {a.status.replace("_", " ")}
                  </Badge>
                  <div className="lvx-muted">Open →</div>
                </div>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}