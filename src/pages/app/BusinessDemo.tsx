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
function formatVerticalLabel(vertical: string | null) {
  if (!vertical) return "Unknown Vertical";
  if (vertical === "home_services") return "Home Services";
  if (vertical === "beauty_personal") return "Beauty / Personal";
  if (vertical === "food_hospitality") return "Food / Hospitality";
  return vertical;
}

function getOpportunityGap(
  profile: BusinessProfileRow | null,
  socials: BusinessSocialRow[],
  insights: OpportunityInsightRow[]
) {
  if (insights.length > 0) return insights[0].description;
  if (!profile?.website && socials.length === 0) {
    return "This business has very limited visible digital presence.";
  }
  if ((profile?.google_review_count ?? 0) >= 20 && socials.length === 0) {
    return "This business has trust signals, but almost no visible social activity.";
  }
  return "This business would benefit from stronger, more consistent visibility.";
}

function buildExamplePosts(
  business: BusinessRow | null,
  profile: BusinessProfileRow | null
) {
  const businessName = business?.business_name || "This Business";
  const service = profile?.services?.[0] || "featured service";

  return [
    {
      title: "Trust Builder Post",
      body: `${businessName} helps local customers with reliable ${service}. A stronger visual presence would help showcase professionalism and trust.`,
    },
    {
      title: "Offer Spotlight Post",
      body: `A simple promotion-focused post could highlight ${service} and make the business easier to notice and remember.`,
    },
    {
      title: "Local Visibility Post",
      body: `${businessName} can use consistent content to stay visible in the local market and reinforce brand familiarity.`,
    },
  ];
}

function buildFeedPreviewNames(business: BusinessRow | null) {
  const name = business?.business_name || "Business";
  return [
    `${name} — Brand Introduction`,
    `${name} — Service Highlight`,
    `${name} — Reputation Builder`,
    `${name} — Local Offer`,
    `${name} — Customer Trust Post`,
    `${name} — Before / After Style Post`,
  ];
}

// SECTION: Component
export default function BusinessDemo() {
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

    async function loadDemo() {
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
        setError(firstError.message || "Failed to load demo mode.");
        setLoading(false);
        return;
      }

      setBusiness((businessRes.data as BusinessRow | null) ?? null);
      setProfile((profileRes.data as BusinessProfileRow | null) ?? null);
      setSocials((socialsRes.data as BusinessSocialRow[]) ?? []);
      setInsights((insightsRes.data as OpportunityInsightRow[]) ?? []);
      setLoading(false);
    }

    loadDemo();

    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const opportunityGap = useMemo(() => {
    return getOpportunityGap(profile, socials, insights);
  }, [profile, socials, insights]);

  const examplePosts = useMemo(() => {
    return buildExamplePosts(business, profile);
  }, [business, profile]);

  const feedPreviewItems = useMemo(() => {
    return buildFeedPreviewNames(business);
  }, [business]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Loading Demo Mode…</div>
        <div className="mt-2 text-sm opacity-70">Preparing presentation flow.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Demo Mode Error</div>
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
            Demo Mode
          </div>
          <div className="mt-2 text-2xl font-bold">
            {business.business_name || "Unnamed Business"}
          </div>
          <div className="mt-1 text-sm opacity-70">
            {formatVerticalLabel(business.vertical)}
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

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">1. Current Presence</div>
        <div className="mt-3 text-sm">
          {profile?.summary || "Current presence appears limited or underdeveloped."}
        </div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">2. Opportunity Gap</div>
        <div className="mt-3 text-sm">{opportunityGap}</div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">3. Example Marketing</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {examplePosts.map((post) => (
            <div key={post.title} className="rounded-xl border p-4">
              <div className="text-sm font-semibold">{post.title}</div>
              <div className="mt-2 text-sm">{post.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">4. Feed Preview</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {feedPreviewItems.map((item) => (
            <div key={item} className="rounded-xl border p-4 text-sm">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border p-5">
        <div className="text-base font-semibold">5. Package Offer</div>
        <div className="mt-3 text-sm">
          Setup Fee: $600
        </div>
        <div className="mt-1 text-sm">
          Monthly Visibility Service: $399/month
        </div>
        <div className="mt-3 text-sm opacity-70">
          This presentation is a structured example of how Lumvexor positions recurring visibility services.
        </div>
      </div>
    </div>
  );
}