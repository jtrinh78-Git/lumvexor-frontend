import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// SECTION: Types
type BusinessRow = {
  id: string;
  business_name: string | null;
  vertical: string | null;
  address_normalized: string | null;
  status: string | null;
};

type BusinessProfileRow = {
  business_id: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  services: string[] | null;
  summary: string | null;
};

type BusinessSocialRow = {
  id: string;
  platform: string;
  url: string | null;
  username: string | null;
  followers: number | null;
  last_post_date: string | null;
};

type OpportunityInsightRow = {
  id: string;
  insight_type: string | null;
  description: string;
  severity_score: number | null;
};

// SECTION: Helpers
function formatPlatformLabel(platform: string) {
  const value = String(platform || "").toLowerCase();
  if (value === "instagram") return "Instagram";
  if (value === "facebook") return "Facebook";
  if (value === "tiktok") return "TikTok";
  if (value === "youtube") return "YouTube";
  return platform;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString();
}

function formatAddress(profile: BusinessProfileRow | null, business: BusinessRow | null) {
  const locationParts = [profile?.city, profile?.state].filter(Boolean);
  if (locationParts.length > 0) return locationParts.join(", ");
  return business?.address_normalized || "No address available";
}

function formatVerticalLabel(vertical: string | null) {
  if (!vertical) return "Unknown Vertical";
  if (vertical === "home_services") return "Home Services";
  if (vertical === "beauty_personal") return "Beauty / Personal";
  if (vertical === "food_hospitality") return "Food / Hospitality";
  return vertical;
}

function getPresenceScore(
  profile: BusinessProfileRow | null,
  socials: BusinessSocialRow[]
) {
  let score = 0;

  if (profile?.website) score += 1;
  if ((profile?.google_review_count ?? 0) > 0) score += 1;
  if (socials.length > 0) score += 1;
  if (socials.some((s) => !!s.last_post_date)) score += 1;

  return score;
}

function getOnlinePresenceLabel(
  profile: BusinessProfileRow | null,
  socials: BusinessSocialRow[]
) {
  const score = getPresenceScore(profile, socials);
  if (score >= 4) return "Strong";
  if (score >= 2) return "Moderate";
  return "Weak";
}

function buildOpportunityHeadline(
  insights: OpportunityInsightRow[],
  socials: BusinessSocialRow[],
  profile: BusinessProfileRow | null
) {
  if (insights.length > 0) return insights[0].description;

  const hasWebsite = Boolean(profile?.website);
  const reviewCount = profile?.google_review_count ?? 0;
  const hasInstagram = socials.some((s) => s.platform.toLowerCase() === "instagram");
  const hasFacebook = socials.some((s) => s.platform.toLowerCase() === "facebook");

  if (reviewCount >= 20 && (!hasInstagram || !hasFacebook)) {
    return "Strong reputation but weak social visibility.";
  }

  if (!hasWebsite && socials.length === 0) {
    return "Very limited digital presence creates a clear visibility gap.";
  }

  if (reviewCount === 0) {
    return "Low review visibility may be weakening trust with new customers.";
  }

  return "Visibility consistency appears to be the main opportunity.";
}

function buildOpeningAngle(
  business: BusinessRow | null,
  profile: BusinessProfileRow | null,
  socials: BusinessSocialRow[],
  insights: OpportunityInsightRow[]
) {
  const verticalLabel = formatVerticalLabel(business?.vertical ?? null);
  const reviewCount = profile?.google_review_count ?? 0;
  const rating = profile?.google_rating;
  const hasWebsite = Boolean(profile?.website);
  const presence = getOnlinePresenceLabel(profile, socials);

  if (insights.length > 0) {
    return `You already have a business foundation in ${verticalLabel}. The immediate opportunity is improving visibility where your current presence is underperforming so more local customers see the quality of the business.`;
  }

  if (reviewCount >= 20 && rating && rating >= 4) {
    return "You already have strong trust signals. The next step is turning that reputation into more visible, consistent marketing so more local customers notice you before they choose a competitor.";
  }

  if (!hasWebsite && presence === "Weak") {
    return "Right now the business looks underexposed online. The opportunity is to create a stronger first impression and more consistent visibility so potential customers see professionalism immediately.";
  }

  return "The opportunity is to make the business look more visible, more current, and easier to trust when people check online before calling.";
}

function buildQuickFacts(
  business: BusinessRow | null,
  profile: BusinessProfileRow | null,
  socials: BusinessSocialRow[]
) {
  const facts: string[] = [];

  facts.push(`Vertical: ${formatVerticalLabel(business?.vertical ?? null)}`);
  facts.push(`Location: ${formatAddress(profile, business)}`);

  if (typeof profile?.google_rating === "number") {
    facts.push(`Google Rating: ${profile.google_rating}`);
  }

  if (typeof profile?.google_review_count === "number") {
    facts.push(`Google Reviews: ${profile.google_review_count}`);
  }

  if (profile?.services && profile.services.length > 0) {
    facts.push(`Services: ${profile.services.slice(0, 3).join(", ")}`);
  }

  facts.push(`Social Profiles Found: ${socials.length}`);

  return facts;
}

// SECTION: Component
export default function BusinessBriefing() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [profile, setProfile] = useState<BusinessProfileRow | null>(null);
  const [socials, setSocials] = useState<BusinessSocialRow[]>([]);
  const [insights, setInsights] = useState<OpportunityInsightRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadBriefing() {
      if (!businessId) {
        setError("Missing business ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [businessRes, profileRes, socialsRes, insightsRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, business_name, vertical, address_normalized, status")
          .eq("id", businessId)
          .maybeSingle(),
        supabase
          .from("business_profiles")
          .select(
            "business_id, website, phone, city, state, zip, google_rating, google_review_count, services, summary"
          )
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("business_socials")
          .select("id, platform, url, username, followers, last_post_date")
          .eq("business_id", businessId)
          .order("platform", { ascending: true }),
        supabase
          .from("opportunity_insights")
          .select("id, insight_type, description, severity_score")
          .eq("business_id", businessId)
          .order("severity_score", { ascending: false }),
      ]);

      if (!isMounted) return;

      const firstError =
        businessRes.error || profileRes.error || socialsRes.error || insightsRes.error;

      if (firstError) {
        setError(firstError.message || "Failed to load business briefing.");
        setLoading(false);
        return;
      }

      setBusiness((businessRes.data as BusinessRow | null) ?? null);
      setProfile((profileRes.data as BusinessProfileRow | null) ?? null);
      setSocials((socialsRes.data as BusinessSocialRow[]) ?? []);
      setInsights((insightsRes.data as OpportunityInsightRow[]) ?? []);
      setLoading(false);
    }

    loadBriefing();

    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const socialMap = useMemo(() => {
    const map = new Map<string, BusinessSocialRow>();
    for (const row of socials) {
      map.set(String(row.platform || "").toLowerCase(), row);
    }
    return map;
  }, [socials]);

  const opportunityHeadline = useMemo(() => {
    return buildOpportunityHeadline(insights, socials, profile);
  }, [insights, socials, profile]);

  const openingAngle = useMemo(() => {
    return buildOpeningAngle(business, profile, socials, insights);
  }, [business, profile, socials, insights]);

  const quickFacts = useMemo(() => {
    return buildQuickFacts(business, profile, socials);
  }, [business, profile, socials]);

  const platformOrder = ["instagram", "facebook", "tiktok", "youtube"];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Loading business briefing…</div>
        <div className="mt-2 text-sm opacity-70">Preparing pre-visit business intelligence.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Business Briefing Error</div>
        <div className="mt-2 text-sm text-red-600">{error}</div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 rounded-lg border px-4 py-2 text-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Business not found</div>
        <div className="mt-2 text-sm opacity-70">No matching business record was found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
            Business Briefing
          </div>
          <div className="mt-2 text-2xl font-bold">
            {business.business_name || "Unnamed Business"}
          </div>
          <div className="mt-1 text-sm opacity-70">
            {formatVerticalLabel(business.vertical)}
          </div>
          <div className="mt-1 text-sm opacity-70">{formatAddress(profile, business)}</div>
          <div className="mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium">
            Status: {business.status || "Unknown"}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-5">
          <div className="text-base font-semibold">Business Snapshot</div>
          <div className="mt-3 text-sm">
            {profile?.summary || "No business summary has been added yet."}
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="font-medium">Website:</span>{" "}
              {profile?.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {profile.website}
                </a>
              ) : (
                "Not available"
              )}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {profile?.phone || "Not available"}
            </div>
            <div>
              <span className="font-medium">Services:</span>{" "}
              {profile?.services && profile.services.length > 0
                ? profile.services.join(", ")
                : "Not available"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-base font-semibold">Online Presence</div>
          <div className="mt-4 text-3xl font-bold">
            {getOnlinePresenceLabel(profile, socials)}
          </div>
          <div className="mt-2 text-sm opacity-70">
            {typeof profile?.google_review_count === "number"
              ? `${profile.google_review_count} Google reviews`
              : "Review count not available"}
          </div>
          <div className="mt-1 text-sm opacity-70">
            {profile?.google_rating ? `Rating: ${profile.google_rating}` : "Rating not available"}
          </div>
          <div className="mt-1 text-sm opacity-70">
            {socials.length > 0
              ? `${socials.length} social profile(s) detected`
              : "No social profiles detected"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">Opportunity Insight</div>
        <div className="mt-3 text-sm">{opportunityHeadline}</div>

        {insights.length > 0 && (
          <div className="mt-4 space-y-3">
            {insights.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="text-sm font-medium">
                  {item.insight_type || "Opportunity Insight"}
                </div>
                <div className="mt-1 text-sm">{item.description}</div>
                <div className="mt-2 text-xs opacity-70">
                  Severity: {item.severity_score ?? "Unknown"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">Opening Angle</div>
        <div className="mt-3 text-sm">{openingAngle}</div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">Quick Facts</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {quickFacts.map((fact) => (
            <div key={fact} className="rounded-xl border p-4 text-sm">
              {fact}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">Social Presence</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {platformOrder.map((platform) => {
            const row = socialMap.get(platform);
            const isPresent = Boolean(row);

            return (
              <div key={platform} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{formatPlatformLabel(platform)}</div>
                  <div className="text-sm">{isPresent ? "Present" : "Missing"}</div>
                </div>

                <div className="mt-2 text-sm opacity-80">
                  Username: {row?.username || "Not available"}
                </div>
                <div className="mt-1 text-sm opacity-80">
                  Followers: {typeof row?.followers === "number" ? row.followers : "Unknown"}
                </div>
                <div className="mt-1 text-sm opacity-80">
                  Last Post: {formatDate(row?.last_post_date || null)}
                </div>

                <div className="mt-2 text-sm">
                  {row?.url ? (
                    <a href={row.url} target="_blank" rel="noreferrer" className="underline">
                      Open Profile
                    </a>
                  ) : (
                    "No profile URL"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}