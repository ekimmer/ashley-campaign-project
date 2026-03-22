import { anthropic } from "@/lib/anthropic";
import type {
  BinType,
  SentimentType,
  ReachType,
  AlertTier,
  Campaign,
} from "@/types/database";

export interface CandidateHitResult {
  source_name: string;
  comment_summary: string;
  context: string;
}

export interface AlertGroupingResult {
  existing_alert_id: string | null;
}

export interface AIAnalysisResult {
  bin: BinType;
  sentiment: SentimentType;
  reach: ReachType;
  key_themes: string[];
  ai_summary: string;
  va_politics_relevant: boolean;
  va_politics_topics: string[];
  alert_tier: AlertTier;
  alert_reason: string | null;
  detected_entities: DetectedEntityResult[];
  candidate_hits: CandidateHitResult[];
}

export interface DetectedEntityResult {
  name: string;
  role: "opponent" | "supporter" | "neutral";
  context: string;
  confidence: number;
  entity_role: "subject" | "mentioned" | "quoted";
  entity_type: "opponent" | "supporter" | "neutral" | "other";
  sentiment_toward: SentimentType;
}

const ANALYSIS_PROMPT = `You are an AI analyst for a political campaign intelligence system. Analyze the following news article and return a structured JSON response.

Campaign context:
- Candidate: {candidate_name}
- District: {district}
- Known opponents: {opponents}

Article to analyze:
Headline: {headline}
Outlet: {outlet}
Content: {content}

Return a JSON object with these exact fields:
{
  "bin": "candidate" | "opponent" | "general_race",
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "reach": "national" | "regional" | "local" | "niche",
  "key_themes": ["theme1", "theme2", "theme3"],
  "ai_summary": "A concise 1-2 sentence summary of the article",
  "va_politics_relevant": true | false,
  "va_politics_topics": ["topic1", "topic2"],
  "alert_tier": "critical" | "high" | "standard" | "none",
  "alert_reason": "reason string or null",
  "detected_entities": [
    {
      "name": "Person Name",
      "role": "opponent" | "supporter" | "neutral",
      "context": "The sentence or context where they appear",
      "confidence": 0.0-1.0,
      "entity_role": "subject" | "mentioned" | "quoted",
      "entity_type": "opponent" | "supporter" | "neutral" | "other",
      "sentiment_toward": "positive" | "neutral" | "negative" | "mixed"
    }
  ],
  "candidate_hits": [
    {
      "source_name": "Person or organization making the negative statement",
      "comment_summary": "1-2 sentence summary of the negative comment or attack",
      "context": "The direct quote or paraphrase from the article"
    }
  ]
}

Classification rules:
- bin "candidate": Article primarily about {candidate_name}
- bin "opponent": Article primarily about a known or potential opponent
- bin "general_race": About the race, district, or political landscape broadly
- alert_tier "critical": Negative national coverage of candidate, viral negative story, opponent attack
- alert_tier "high": New poll results, significant policy announcement, notable endorsement
- alert_tier "standard": Routine coverage worth noting
- alert_tier "none": Background/low-impact coverage
- va_politics_relevant: true if article discusses broader VA political dynamics, statewide issues, or political landscape
- detected_entities: List ALL people mentioned (excluding {candidate_name}). Flag potential opponents and supporters.
- candidate_hits: Extract ANY specific negative comments, criticisms, or attacks directed at {candidate_name} or the Virginia GOP in the context of the congressional race. Include statements from any source: political figures, Democrat affiliates, opponents, PACs, advocacy groups, or individuals. Return an empty array if no negative hits are found.

Return ONLY valid JSON, no markdown or explanation.`;

export async function determineAlertGrouping(
  alertTitle: string,
  alertDescription: string,
  alertTier: string,
  recentAlerts: { id: string; title: string; description: string; tier: string }[]
): Promise<AlertGroupingResult> {
  if (recentAlerts.length === 0) {
    return { existing_alert_id: null };
  }

  const alertList = recentAlerts
    .map((a) => `- ID: ${a.id} | Tier: ${a.tier} | ${a.title}: ${a.description}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `You are a campaign alert system. Determine if a new alert belongs to an existing alert topic or is a new topic.

New alert:
- Title: ${alertTitle}
- Description: ${alertDescription}
- Tier: ${alertTier}

Existing recent alerts:
${alertList}

Rules:
- Only group if the new alert is about the SAME topic/event as an existing alert
- NEVER group a critical-tier alert under a lower-tier alert
- If unsure, create a new alert (return null)

Return JSON: {"existing_alert_id": "uuid-of-matching-alert" or null}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { existing_alert_id: null };

  try {
    return JSON.parse(jsonMatch[0]) as AlertGroupingResult;
  } catch {
    return { existing_alert_id: null };
  }
}

export async function analyzeArticle(
  headline: string,
  outlet: string,
  content: string | null,
  campaign: Campaign,
  opponentNames: string[]
): Promise<AIAnalysisResult> {
  const prompt = ANALYSIS_PROMPT
    .replace(/{candidate_name}/g, campaign.candidate_name)
    .replace(/{district}/g, campaign.district)
    .replace(/{opponents}/g, opponentNames.length > 0 ? opponentNames.join(", ") : "None identified yet")
    .replace(/{headline}/g, headline)
    .replace(/{outlet}/g, outlet)
    .replace(/{content}/g, content || "[Full text unavailable - analyze based on headline and outlet only]");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      // Extract JSON from response (handle potential markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const result = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < 2) {
        // Exponential backoff: 1s, 2s
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("AI analysis failed after 3 attempts");
}

export async function generateBinSummary(
  articles: { headline: string; outlet: string; sentiment: string; ai_summary: string; date_published: string }[],
  bin: string,
  candidateName: string
): Promise<{ summary: string; trend: "increasing" | "stable" | "declining" }> {
  const articleList = articles
    .map((a) => `- [${a.sentiment}] ${a.headline} (${a.outlet}, ${a.date_published}):\n  ${a.ai_summary}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are a campaign intelligence analyst. Summarize the following ${bin} news coverage for the ${candidateName} campaign.

Articles (${articles.length} total):
${articleList}

Write a 200-300 word summary answering:
1. What is the dominant narrative?
2. Has the tone shifted recently?
3. What are the top 2-3 stories driving coverage?

Also assess the narrative trend: is coverage "increasing", "stable", or "declining" compared to what you'd expect?

Return JSON:
{
  "summary": "your 200-300 word summary",
  "trend": "increasing" | "stable" | "declining"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in summary response");
  return JSON.parse(jsonMatch[0]);
}

export async function generateVaPoliticsBriefing(
  articles: { headline: string; outlet: string; ai_summary: string; va_politics_topics: string[]; date_published: string }[],
  candidateName: string,
  district: string
): Promise<{
  briefing: string;
  hot_issues: { name: string; summary: string; partisan_lean: string; district_relevance: string }[];
  so_what: string;
}> {
  const articleList = articles
    .map((a) => `- ${a.headline} (${a.outlet}, ${a.date_published}): ${a.ai_summary}\n  Topics: ${a.va_politics_topics.join(", ")}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a senior political strategist. Generate a Virginia politics briefing for the ${candidateName} campaign (${district}).

VA-politics-relevant articles (${articles.length} total):
${articleList}

Generate:
1. A 300-500 word briefing covering key political dynamics, endorsements, party dynamics, and district-level context
2. A ranked list of top 5-10 hot-button issues driving Virginia political discourse
3. A "So What" section with 2-3 strategic implications for the campaign

Return JSON:
{
  "briefing": "300-500 word briefing text",
  "hot_issues": [
    {"name": "Issue Name", "summary": "Brief summary", "partisan_lean": "Republican/Democrat/Bipartisan/Contested", "district_relevance": "High/Medium/Low"}
  ],
  "so_what": "2-3 strategic implications paragraph"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in briefing response");
  return JSON.parse(jsonMatch[0]);
}

export async function generateContentIdeas(
  articles: { headline: string; outlet: string; ai_summary: string; sentiment: string; key_themes: string[]; date_published: string }[],
  candidateName: string
): Promise<{ ideas: { category: string; title: string; content: string; format: string; source_headline: string }[] }> {
  const articleList = articles
    .map((a) => `- [${a.sentiment}] ${a.headline} (${a.outlet}, ${a.date_published}): ${a.ai_summary}\n  Themes: ${a.key_themes.join(", ")}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a campaign content strategist for the ${candidateName} campaign. Based on recent news coverage, generate social media and video content ideas that maximize impact and virality.

Recent articles (${articles.length} total):
${articleList}

Generate 5-8 content ideas. For each, provide:
- category: "social" (social media post), "video" (reel/video), or "interview" (talking points)
- title: A catchy, actionable title for the content piece
- content: 2-3 sentence description of the content, including suggested messaging, tone, and hook
- format: Specific format (e.g., "Instagram Reel", "Twitter/X Thread", "Facebook Post", "TikTok Video", "Interview Prep")
- source_headline: The article headline this idea draws from

Focus on:
- Responding to current narratives in the news cycle
- Proactive messaging that positions the candidate favorably
- Content that supporters would want to share
- Addressing attacks or negative coverage constructively

Return JSON:
{
  "ideas": [
    {"category": "social", "title": "...", "content": "...", "format": "...", "source_headline": "..."}
  ]
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in content ideas response");
  return JSON.parse(jsonMatch[0]);
}

export async function generateNewsletterOutline(
  articles: { headline: string; outlet: string; ai_summary: string; bin: string; sentiment: string; date_published: string }[],
  candidateName: string,
  district: string
): Promise<{ outline_html: string }> {
  const articleList = articles
    .map((a) => `- [${a.bin}/${a.sentiment}] ${a.headline} (${a.outlet}, ${a.date_published}): ${a.ai_summary}`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are a campaign communications director for the ${candidateName} campaign (${district}). Draft a daily newsletter outline for campaign supporters.

Recent articles (last 24 hours, ${articles.length} total):
${articleList}

Create a newsletter outline with these sections:
1. **Today's Top Stories** - 2-3 most important stories with brief summaries and campaign perspective
2. **Campaign Updates** - What the candidate is doing, upcoming events, achievements
3. **In the News** - Other notable coverage with brief context
4. **What You Can Do** - 1-2 calls to action for supporters (share, volunteer, donate, attend events)
5. **Quote of the Day** - An inspiring or relevant quote

Write in a warm, engaging tone appropriate for campaign supporters. Use HTML formatting (h2, h3, p, ul, li, strong, em tags).

Return JSON:
{
  "outline_html": "<h2>Today's Top Stories</h2>..."
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in newsletter response");
  return JSON.parse(jsonMatch[0]);
}

export async function generateHitResponse(
  hit: { source_name: string; comment_summary: string; context: string },
  candidateName: string
): Promise<{ response_text: string; tone: string }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `You are a rapid response strategist for the ${candidateName} campaign. Draft a response to a negative hit.

Negative hit:
- Source: ${hit.source_name}
- Summary: ${hit.comment_summary}
- Original context: ${hit.context}

Generate a strategic response that:
1. Addresses the specific criticism without amplifying it
2. Pivots to the candidate's strengths and record
3. Includes suggested talking points for surrogates
4. Notes the recommended tone (e.g., "firm but measured", "dismissive", "factual rebuttal")

Return JSON:
{
  "response_text": "The full response draft with talking points",
  "tone": "Recommended tone description"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in hit response");
  return JSON.parse(jsonMatch[0]);
}
