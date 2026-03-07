import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../auth/ProfileProvider";
import { useNavigate } from "react-router-dom";

// SECTION: Types
type FeatureSettingsRow = {
  org_id: string;
  email_infrastructure_enabled_for_agents: boolean;
  email_infrastructure_enabled_for_clients: boolean;
};

type CampaignRow = {
  id: string;
  org_id: string;
  name: string;
  campaign_type: string;
  subject: string | null;
  body_text: string | null;
  preview_path: string | null;
  status: string;
  daily_send_limit: number;
  created_at: string;
  updated_at: string;
};

type CampaignWithCounts = CampaignRow & {
  lead_count: number;
  queued_count: number;
};

type LeadRow = {
  id: string;
  campaign_id: string;
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

// SECTION: Component
export default function EmailInfrastructure() {
  const { activeOrgId, role, loading } = useProfile() as {
    activeOrgId?: string | null;
    role?: string | null;
    loading?: boolean;
  };

  const navigate = useNavigate();

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enabledForAgents, setEnabledForAgents] = useState(false);
  const [enabledForClients, setEnabledForClients] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [dailySendLimit, setDailySendLimit] = useState("50");

  const [campaigns, setCampaigns] = useState<CampaignWithCounts[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const [leadBusinessName, setLeadBusinessName] = useState("");
  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadLastName, setLeadLastName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadWebsite, setLeadWebsite] = useState("");
  const [leadCity, setLeadCity] = useState("");
  const [leadState, setLeadState] = useState("");
  const [leadSource, setLeadSource] = useState("manual");

  const [selectedCampaignLeads, setSelectedCampaignLeads] = useState<LeadRow[]>([]);

  const isAdmin = role === "admin";

  // SECTION: Data Loading
  async function loadEverything() {
    if (!activeOrgId) {
      setError("Organization not resolved.");
      setPageLoading(false);
      return;
    }

    if (!isAdmin) {
      setError("Access denied.");
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setError(null);

    const { data: featureData, error: featureError } = await supabase
      .from("org_feature_settings")
      .select("org_id, email_infrastructure_enabled_for_agents, email_infrastructure_enabled_for_clients")
      .eq("org_id", activeOrgId)
      .maybeSingle();

    if (featureError) {
      setError(featureError.message || "Failed to load feature settings.");
      setPageLoading(false);
      return;
    }

    let settingsRow = featureData as FeatureSettingsRow | null;

    if (!settingsRow) {
      const { data: insertedSettings, error: insertSettingsError } = await supabase
        .from("org_feature_settings")
        .insert({
          org_id: activeOrgId,
          email_infrastructure_enabled_for_agents: false,
          email_infrastructure_enabled_for_clients: false,
        })
        .select("org_id, email_infrastructure_enabled_for_agents, email_infrastructure_enabled_for_clients")
        .single();

      if (insertSettingsError) {
        setError(insertSettingsError.message || "Failed to initialize feature settings.");
        setPageLoading(false);
        return;
      }

      settingsRow = insertedSettings as FeatureSettingsRow;
    }

    setEnabledForAgents(settingsRow.email_infrastructure_enabled_for_agents);
    setEnabledForClients(settingsRow.email_infrastructure_enabled_for_clients);

    const { data: campaignRows, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false });

    if (campaignError) {
      setError(campaignError.message || "Failed to load campaigns.");
      setPageLoading(false);
      return;
    }

    const baseCampaigns = (campaignRows as CampaignRow[]) ?? [];
    const enriched: CampaignWithCounts[] = [];

    for (const campaign of baseCampaigns) {
      const { count: leadCount } = await supabase
        .from("email_leads")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaign.id);

      const { count: queuedCount } = await supabase
        .from("email_queue")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "queued");

      enriched.push({
        ...campaign,
        lead_count: leadCount ?? 0,
        queued_count: queuedCount ?? 0,
      });
    }

    setCampaigns(enriched);

    if (enriched.length === 0) {
      setSelectedCampaignId("");
      setSelectedCampaignLeads([]);
      setPageLoading(false);
      return;
    }

    const selectedStillExists = enriched.some((campaign) => campaign.id === selectedCampaignId);
    const nextCampaignId = selectedStillExists ? selectedCampaignId : enriched[0].id;
    setSelectedCampaignId(nextCampaignId);

    await loadLeadsForCampaign(nextCampaignId);
    setPageLoading(false);
  }

  async function loadLeadsForCampaign(campaignId: string) {
    if (!campaignId) {
      setSelectedCampaignLeads([]);
      return;
    }

    const { data, error: leadsError } = await supabase
      .from("email_leads")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (leadsError) {
      setError(leadsError.message || "Failed to load leads.");
      setSelectedCampaignLeads([]);
      return;
    }

    setSelectedCampaignLeads((data as LeadRow[]) ?? []);
  }

  useEffect(() => {
    if (loading) return;
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, role, loading]);

  useEffect(() => {
    if (!selectedCampaignId || !isAdmin) return;
    loadLeadsForCampaign(selectedCampaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  // SECTION: Handlers
  async function handleSaveSettings() {
    if (!activeOrgId) {
      setError("Organization not resolved.");
      return;
    }

    setSavingSettings(true);
    setError(null);

    const { error } = await supabase
      .from("org_feature_settings")
      .upsert({
        org_id: activeOrgId,
        email_infrastructure_enabled_for_agents: enabledForAgents,
        email_infrastructure_enabled_for_clients: enabledForClients,
      });

    if (error) {
      setError(error.message || "Failed to save settings.");
      setSavingSettings(false);
      return;
    }

    setSavingSettings(false);
  }

  async function handleCreateCampaign() {
    if (!activeOrgId) {
      setError("Organization not resolved.");
      return;
    }

    if (!campaignName.trim()) {
      setError("Campaign name is required.");
      return;
    }

    setSavingCampaign(true);
    setError(null);

    const parsedLimit = Number(dailySendLimit);
    const safeDailyLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;

    const { data, error } = await supabase
      .from("email_campaigns")
      .insert({
        org_id: activeOrgId,
        name: campaignName.trim(),
        campaign_type: "visibility_outreach",
        subject: campaignSubject.trim() || null,
        body_text: campaignBody.trim() || null,
        status: "draft",
        daily_send_limit: safeDailyLimit,
      })
      .select("*")
      .single();

    if (error) {
      setError(error.message || "Failed to create campaign.");
      setSavingCampaign(false);
      return;
    }

    setCampaignName("");
    setCampaignSubject("");
    setCampaignBody("");
    setDailySendLimit("50");
    setSavingCampaign(false);

    const newCampaign = data as CampaignRow;
    setSelectedCampaignId(newCampaign.id);
    await loadEverything();
  }

  async function handleCreateLead() {
    if (!selectedCampaignId) {
      setError("Select a campaign before adding leads.");
      return;
    }

    if (!leadBusinessName.trim()) {
      setError("Business name is required.");
      return;
    }

    if (!leadEmail.trim()) {
      setError("Lead email is required.");
      return;
    }

    setSavingLead(true);
    setError(null);

    const { error } = await supabase
      .from("email_leads")
      .insert({
        campaign_id: selectedCampaignId,
        business_name: leadBusinessName.trim(),
        first_name: leadFirstName.trim() || null,
        last_name: leadLastName.trim() || null,
        email: leadEmail.trim(),
        website: leadWebsite.trim() || null,
        city: leadCity.trim() || null,
        state: leadState.trim() || null,
        source: leadSource.trim() || "manual",
        status: "new",
      });

    if (error) {
      setError(error.message || "Failed to create lead.");
      setSavingLead(false);
      return;
    }

    setLeadBusinessName("");
    setLeadFirstName("");
    setLeadLastName("");
    setLeadEmail("");
    setLeadWebsite("");
    setLeadCity("");
    setLeadState("");
    setLeadSource("manual");
    setSavingLead(false);

    await loadEverything();
  }

  // SECTION: Derived State
  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, item) => {
        acc.campaigns += 1;
        acc.leads += item.lead_count;
        acc.queued += item.queued_count;
        return acc;
      },
      { campaigns: 0, leads: 0, queued: 0 }
    );
  }, [campaigns]);

  const selectedCampaign = useMemo(() => {
    return campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  }, [campaigns, selectedCampaignId]);

  // SECTION: Loading States
  if (pageLoading) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Loading Email Infrastructure…</div>
        <div className="mt-2 text-sm opacity-70">Preparing owner controls.</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Access Restricted</div>
        <div className="mt-2 text-sm opacity-70">
          Email Infrastructure is currently restricted to the admin role.
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 rounded-lg border px-4 py-2 text-sm"
        >
          Back
        </button>
      </div>
    );
  }

  // SECTION: UI
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
            Email Infrastructure
          </div>
          <div className="mt-2 text-2xl font-bold">Admin Control Layer</div>
          <div className="mt-2 text-sm opacity-70">
            Campaign infrastructure is active. Sending execution remains locked until the next phase.
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Back
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-5">
          <div className="text-sm opacity-70">Campaigns</div>
          <div className="mt-2 text-3xl font-bold">{totals.campaigns}</div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-sm opacity-70">Leads</div>
          <div className="mt-2 text-3xl font-bold">{totals.leads}</div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-sm opacity-70">Queued</div>
          <div className="mt-2 text-3xl font-bold">{totals.queued}</div>
        </div>
      </div>

      <div className="rounded-2xl border p-5 space-y-4">
        <div className="text-base font-semibold">Access Policy</div>

        <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <div className="text-sm font-medium">Enable for agents</div>
            <div className="mt-1 text-sm opacity-70">
              Keep off until agent workflow is production-safe.
            </div>
          </div>
          <input
            type="checkbox"
            checked={enabledForAgents}
            onChange={(e) => setEnabledForAgents(e.target.checked)}
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
          <div>
            <div className="text-sm font-medium">Enable for clients</div>
            <div className="mt-1 text-sm opacity-70">
              Keep off until client-facing campaign workflows are finalized.
            </div>
          </div>
          <input
            type="checkbox"
            checked={enabledForClients}
            onChange={(e) => setEnabledForClients(e.target.checked)}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {savingSettings ? "Saving…" : "Save Settings"}
          </button>

          <div className="text-sm opacity-70">
            Admin retains access regardless of flag state.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-5 space-y-4">
        <div className="text-base font-semibold">Create Campaign</div>

        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Campaign name"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Email subject"
            value={campaignSubject}
            onChange={(e) => setCampaignSubject(e.target.value)}
          />

          <textarea
            className="rounded-lg border px-3 py-2 text-sm min-h-[140px]"
            placeholder="Email body"
            value={campaignBody}
            onChange={(e) => setCampaignBody(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Daily send limit"
            value={dailySendLimit}
            onChange={(e) => setDailySendLimit(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateCampaign}
            disabled={savingCampaign}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {savingCampaign ? "Creating…" : "Create Campaign"}
          </button>

          <div className="text-sm opacity-70">
            Campaigns begin in draft status by default.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-base font-semibold">Lead Management</div>
            <div className="mt-1 text-sm opacity-70">
              Add leads directly into a selected campaign.
            </div>
          </div>

          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
          >
            <option value="">Select campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Business name"
            value={leadBusinessName}
            onChange={(e) => setLeadBusinessName(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Lead email"
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="First name"
            value={leadFirstName}
            onChange={(e) => setLeadFirstName(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Last name"
            value={leadLastName}
            onChange={(e) => setLeadLastName(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Website"
            value={leadWebsite}
            onChange={(e) => setLeadWebsite(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Source"
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="City"
            value={leadCity}
            onChange={(e) => setLeadCity(e.target.value)}
          />

          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="State"
            value={leadState}
            onChange={(e) => setLeadState(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateLead}
            disabled={savingLead || !selectedCampaignId}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {savingLead ? "Adding…" : "Add Lead"}
          </button>

          <div className="text-sm opacity-70">
            {selectedCampaign ? `Selected: ${selectedCampaign.name}` : "Select a campaign to enable lead creation."}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">Campaigns</div>

        {campaigns.length === 0 ? (
          <div className="mt-3 text-sm opacity-70">No campaigns created yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`rounded-xl border p-4 ${campaign.id === selectedCampaignId ? "border-black" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{campaign.name}</div>
                    <div className="mt-1 text-sm opacity-70">Status: {campaign.status}</div>
                    <div className="mt-1 text-sm opacity-70">
                      Daily Limit: {campaign.daily_send_limit}
                    </div>
                    <div className="mt-1 text-sm opacity-70">
                      Leads: {campaign.lead_count} • Queued: {campaign.queued_count}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs opacity-60">
                      {new Date(campaign.created_at).toLocaleString()}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCampaignId(campaign.id)}
                      className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
                    >
                      {campaign.id === selectedCampaignId ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>

                {campaign.subject ? (
                  <div className="mt-3 text-sm">
                    <span className="font-medium">Subject:</span> {campaign.subject}
                  </div>
                ) : null}

                {campaign.body_text ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm opacity-80">
                    {campaign.body_text}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="text-base font-semibold">Selected Campaign Leads</div>
          <div className="text-sm opacity-70">
            {selectedCampaign ? selectedCampaign.name : "No campaign selected"}
          </div>
        </div>

        {!selectedCampaignId ? (
          <div className="mt-3 text-sm opacity-70">Select a campaign to view its leads.</div>
        ) : selectedCampaignLeads.length === 0 ? (
          <div className="mt-3 text-sm opacity-70">No leads added for this campaign yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedCampaignLeads.map((lead) => {
              const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim();

              return (
                <div key={lead.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">
                        {lead.business_name || "Unnamed Business"}
                      </div>

                      <div className="mt-1 text-sm opacity-70">
                        Contact: {fullName || "No contact name"}
                      </div>

                      <div className="mt-1 text-sm opacity-70">
                        Email: {lead.email || "No email"}
                      </div>

                      <div className="mt-1 text-sm opacity-70">
                        Website: {lead.website || "No website"}
                      </div>

                      <div className="mt-1 text-sm opacity-70">
                        Location: {[lead.city, lead.state].filter(Boolean).join(", ") || "No location"}
                      </div>

                      <div className="mt-1 text-sm opacity-70">
                        Source: {lead.source || "Unknown"} • Status: {lead.status}
                      </div>
                    </div>

                    <div className="text-xs opacity-60">
                      {new Date(lead.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}