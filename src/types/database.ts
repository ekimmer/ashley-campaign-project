export type BinType = "candidate" | "opponent" | "general_race";
export type SentimentType = "positive" | "neutral" | "negative" | "mixed";
export type ReachType = "national" | "regional" | "local" | "niche";
export type AlertTier = "critical" | "high" | "standard" | "none";
export type PaywallStatus = "open" | "bypassed" | "unavailable";
export type NarrativeTrend = "increasing" | "stable" | "declining";
export type OpponentSource = "detected" | "manual";
export type OpponentStatus = "active" | "inactive";
export type EntityRole = "subject" | "mentioned" | "quoted";
export type EntityType = "opponent" | "supporter" | "neutral" | "other";
export type DetectedEntityRole = "opponent" | "supporter" | "neutral";
export type UserCampaignRole = "owner" | "admin" | "viewer";
export type ContentIdeaCategory = "social" | "video" | "interview";

export interface Campaign {
  id: string;
  name: string;
  candidate_name: string;
  district: string;
  search_config: SearchConfig;
  alert_email: string;
  digest_time: string;
  created_at: string;
}

export interface SearchConfig {
  candidate_terms: string[];
  general_race_terms: string[];
}

export interface Article {
  id: string;
  campaign_id: string;
  bin: BinType;
  headline: string;
  url: string;
  reporter: string | null;
  outlet: string;
  date_published: string;
  sentiment: SentimentType;
  reach: ReachType;
  key_themes: string[];
  full_text: string | null;
  ai_summary: string;
  paywall_status: PaywallStatus;
  va_politics_relevant: boolean;
  va_politics_topics: string[];
  alert_tier: AlertTier;
  alert_reason: string | null;
  ingested_at: string;
  created_at: string;
}

export interface ArticleEntity {
  id: string;
  article_id: string;
  opponent_id: string | null;
  entity_name: string;
  entity_role: EntityRole;
  entity_type: EntityType;
  sentiment_toward: SentimentType;
}

export interface Opponent {
  id: string;
  campaign_id: string;
  name: string;
  party: string | null;
  office_sought: string | null;
  search_terms: string[];
  bio: string | null;
  status: OpponentStatus;
  source: OpponentSource;
  created_at: string;
}

export interface DetectedEntity {
  id: string;
  campaign_id: string;
  article_id: string;
  name: string;
  role: DetectedEntityRole;
  context: string;
  confidence: number;
  resolved: boolean;
  opponent_id: string | null;
  created_at: string;
  // Joined fields
  article?: Article;
}

export interface BinSummary {
  id: string;
  campaign_id: string;
  bin: BinType;
  summary_text: string;
  narrative_trend: NarrativeTrend;
  article_count: number;
  generated_at: string;
  period_start: string;
  period_end: string;
}

export interface VaPoliticsBriefing {
  id: string;
  campaign_id: string;
  briefing_text: string;
  hot_issues: HotIssue[];
  so_what: string;
  generated_at: string;
  period_start: string;
  period_end: string;
}

export interface HotIssue {
  name: string;
  summary: string;
  partisan_lean: string;
  district_relevance: string;
}

export interface Alert {
  id: string;
  campaign_id: string;
  article_id: string | null;
  tier: "critical" | "high" | "standard";
  title: string;
  description: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  // Joined fields
  article?: Article;
  alert_articles?: AlertArticle[];
}

export interface AlertArticle {
  id: string;
  alert_id: string;
  article_id: string;
  created_at: string;
  // Joined fields
  article?: Article;
}

export interface CandidateHit {
  id: string;
  campaign_id: string;
  article_id: string;
  source_name: string;
  comment_summary: string;
  context: string;
  created_at: string;
  // Joined fields
  article?: Article;
}

export interface ArticleStar {
  id: string;
  campaign_id: string;
  article_id: string;
  starred_at: string;
}

export interface Tag {
  id: string;
  campaign_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface ArticleTag {
  id: string;
  article_id: string;
  tag_id: string;
  created_at: string;
  // Joined fields
  tag?: Tag;
}

export interface ArticleNote {
  id: string;
  campaign_id: string;
  article_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ContentIdea {
  id: string;
  campaign_id: string;
  category: ContentIdeaCategory;
  title: string;
  content: string;
  format: string;
  source_article_ids: string[];
  generated_at: string;
}

export interface NewsletterOutline {
  id: string;
  campaign_id: string;
  outline_html: string;
  source_article_ids: string[];
  generated_at: string;
  period_start: string;
  period_end: string;
}

export interface HitResponse {
  id: string;
  campaign_id: string;
  hit_id: string;
  response_text: string;
  tone: string | null;
  generated_at: string;
}

export interface Digest {
  id: string;
  campaign_id: string;
  content_html: string;
  sent_at: string;
  created_at: string;
}

export interface UserCampaign {
  user_id: string;
  campaign_id: string;
  role: UserCampaignRole;
}
