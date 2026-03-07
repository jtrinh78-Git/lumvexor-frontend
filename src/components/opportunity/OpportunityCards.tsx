import { useMemo } from "react";

// SECTION: Types
export type OpportunityInsightInput = {
  id: string;
  insight_type: string | null;
  description: string;
  severity_score: number | null;
};

export type OpportunityProfileInput = {
  website: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  services: string[] | null;
};

export type OpportunitySocialInput = {
  platform: string;
  username: string | null;
  followers: number | null;
  last_post_date: string | null;
};

type OpportunityCard = {
  id: string;
  title: string;
  detail: string;
  angle: string;
  severity: number;
};

// SECTION: Helpers
function hasPlatform(socials: OpportunitySocialInput[], platform: string) {
  return socials.some((row) => String(row.platform || "").toLowerCase() === platform);
}

function buildCards(
  insights: OpportunityInsightInput[],
  profile: OpportunityProfileInput | null,
  socials: OpportunitySocialInput[]
): OpportunityCard[] {
  const cards: OpportunityCard[] = [];

  for (const item of insights) {
    cards.push({
      id: item.id,
      title: item.insight_type || "Opportunity Insight",
      detail: item.description,
      angle: "Lead with the visibility gap and show how stronger presentation can turn existing trust into more customer attention.",
      severity: item.severity_score ?? 0,
    });
  }

  const reviewCount = profile?.google_review_count ?? 0;
  const rating = profile?.google_rating ?? 0;
  const hasWebsite = Boolean(profile?.website);
  const hasInstagram = hasPlatform(socials, "instagram");
  const hasFacebook = hasPlatform(socials, "facebook");
  const hasTikTok = hasPlatform(socials, "tiktok");
  const hasYouTube = hasPlatform(socials, "youtube");

  if (reviewCount >= 20 && rating >= 4 && (!hasInstagram || !hasFacebook)) {
    cards.push({
      id: "derived-reputation-social-gap",
      title: "Strong Reputation, Weak Social Presence",
      detail:
        "This business appears trustworthy through reviews, but that trust is not being extended into consistent social visibility.",
      angle:
        "Open by showing that the business already has credibility and now needs stronger visibility so more local customers actually notice it.",
      severity: 90,
    });
  }

  if (!hasWebsite) {
    cards.push({
      id: "derived-no-website",
      title: "No Website Presence",
      detail:
        "The business appears to have no website, which weakens first impressions and reduces trust for customers who search before calling.",
      angle:
        "Lead with professionalism and first impression. Show how stronger presentation can make the business look more established immediately.",
      severity: 80,
    });
  }

  if (!hasInstagram && !hasFacebook && !hasTikTok && !hasYouTube) {
    cards.push({
      id: "derived-no-socials",
      title: "Minimal Social Visibility",
      detail:
        "There is little or no visible social presence, which creates a visibility gap against more active competitors.",
      angle:
        "Lead with consistency. Show how regular visible activity helps the business stay current and memorable in the local market.",
      severity: 85,
    });
  }

  if ((profile?.services?.length ?? 0) >= 3) {
    cards.push({
      id: "derived-services-underused",
      title: "Service Value Not Fully Presented",
      detail:
        "The business offers multiple services, but those offers may not be clearly presented in a way that helps prospects understand full value.",
      angle:
        "Lead with better offer presentation. Show how structured marketing examples can make services easier to understand and easier to buy.",
      severity: 70,
    });
  }

  const unique = new Map<string, OpportunityCard>();
  for (const card of cards) {
    if (!unique.has(card.title)) {
      unique.set(card.title, card);
    }
  }

  return Array.from(unique.values())
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3);
}

// SECTION: Component
export function OpportunityCards(props: {
  insights: OpportunityInsightInput[];
  profile: OpportunityProfileInput | null;
  socials: OpportunitySocialInput[];
}) {
  const cards = useMemo(() => {
    return buildCards(props.insights, props.profile, props.socials);
  }, [props.insights, props.profile, props.socials]);

  return (
    <div className="rounded-2xl border p-5">
      <div className="text-base font-semibold">Opportunity Cards</div>
      <div className="mt-2 text-sm opacity-70">
        Select the strongest angles before entering Demo Mode.
      </div>

      {cards.length === 0 ? (
        <div className="mt-4 text-sm opacity-70">
          No opportunity cards available yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div key={card.id} className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">{card.title}</div>
              <div className="mt-2 text-sm">{card.detail}</div>
              <div className="mt-3 text-xs font-medium uppercase tracking-wide opacity-60">
                Opening Angle
              </div>
              <div className="mt-1 text-sm">{card.angle}</div>
              <div className="mt-3 text-xs opacity-60">
                Severity: {card.severity}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}