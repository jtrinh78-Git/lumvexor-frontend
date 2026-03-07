import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardBody, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { useTerritory } from "../../territory/TerritoryContext";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
// SECTION: AppProjects
export function AppProjects() {
  const t = useTerritory();
  const navigate = useNavigate();
  const { session } = useAuth();
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
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <input
              className="lvx-input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name"
            />
            <input
              className="lvx-input"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Street address"
            />
            <input
              className="lvx-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
            <input
              className="lvx-input"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State"
            />
            <input
              className="lvx-input"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP"
            />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Button
                variant="primary"
                disabled={!businessName.trim() || !street.trim()}
                onClick={async () => {
  if (!businessName.trim() || !street.trim()) return;
  const user = session?.user;
  if (!user) {
    alert("Not authenticated");
    return;
  }
  // 1️⃣ create business in Supabase
  const { data, error } = await supabase
    .from("businesses")
    .insert({
  business_name: businessName.trim(),
  address_normalized: `${street}, ${city}, ${state} ${zip}`.trim(),
  vertical: "home_services",
  status: "demo",
  agent_id: user.id,
  google_place_id: crypto.randomUUID(),
})
    .select()
    .single();

  if (error) {
    console.error("Business create error", error);
    alert("Failed to create business");
    return;
  }

  // 2️⃣ create territory address linked to business
  const a = t.createAddress({
    businessName,
    street,
    city,
    state,
    zip,
    businessId: data.id
  });

  setBusinessName("");
  setStreet("");
  setZip("");

  console.log("Created address + business", data.id, a.id);
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
              <div
                key={a.id}
                className="lvx-rowlink"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <Link
                  to={`/app/projects/${a.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    minWidth: 0,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>{a.businessName}</div>
                    <div className="lvx-muted">
                      {a.street}, {a.city}, {a.state} {a.zip}
                    </div>
                  </div>
                </Link>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge variant={a.status === "active_client" ? "accent" : "neutral"}>
                    {a.status.replace("_", " ")}
                  </Badge>

                  <Button
  variant="ghost"
  onClick={() => {
    if (!a.businessId) {
      alert("Business record not linked yet.");
      return;
    }

    navigate(`/app/businesses/${a.businessId}/briefing`);
  }}
>
  Briefing
</Button>

                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/app/projects/${a.id}`)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}