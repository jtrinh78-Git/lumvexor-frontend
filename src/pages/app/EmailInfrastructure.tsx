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
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enabledForAgents, setEnabledForAgents] = useState(false);
  const [enabledForClients, setEnabledForClients] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [dailySendLimit, setDailySendLimit] = useState("50");

  const [campaigns, setCampaigns] = useState<CampaignWithCounts[]>([]);

  const isAdmin = role === "admin";

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
    setPageLoading(false);
  }

  useEffect(() => {
    if (loading) return;
    loadEverything();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, role, loading]);

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

    const { error } = await supabase
      .from("email_campaigns")
      .insert({
        org_id: activeOrgId,
        name: campaignName.trim(),
        campaign_type: "visibility_outreach",
        subject: campaignSubject.trim() || null,
        body_text: campaignBody.trim() || null,
        status: "draft",
        daily_send_limit: safeDailyLimit,
      });

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

    await loadEverything();
  }

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

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

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

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">Campaigns</div>

        {campaigns.length === 0 ? (
          <div className="mt-3 text-sm opacity-70">
            No campaigns created yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{campaign.name}</div>
                    <div className="mt-1 text-sm opacity-70">
                      Status: {campaign.status}
                    </div>
                    <div className="mt-1 text-sm opacity-70">
                      Daily Limit: {campaign.daily_send_limit}
                    </div>
                    <div className="mt-1 text-sm opacity-70">
                      Leads: {campaign.lead_count} • Queued: {campaign.queued_count}
                    </div>
                  </div>

                  <div className="text-xs opacity-60">
                    {new Date(campaign.created_at).toLocaleString()}
                  </div>
                </div>

                {campaign.subject ? (
                  <div className="mt-3 text-sm">
                    <span className="font-medium">Subject:</span> {campaign.subject}
                  </div>
                ) : null}

                {campaign.body_text ? (
                  <div className="mt-2 text-sm opacity-80 whitespace-pre-wrap">
                    {campaign.body_text}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}