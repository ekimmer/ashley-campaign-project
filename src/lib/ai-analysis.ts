import { anthropic } from "@/lib/anthropic";
import type {
  BinType,
  SentimentType,
  ReachType,
  AlertTier,
  Campaign,
} from "@/types/database";

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

Return ONLY valid JSON, no markdown or explanation.`;

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
