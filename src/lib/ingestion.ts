import { createClient as createServiceClient } from "@supabase/supabase-js";
import { searchNews } from "@/lib/serper";
import { scrapeArticle } from "@/lib/scraper";
import { analyzeArticle, generateBinSummary } from "@/lib/ai-analysis";
import type { Campaign, Opponent, BinType } from "@/types/database";
import { resend } from "@/lib/resend";

// Parse relative date strings like "1 month ago", "2 days ago", "5 hours ago"
function parseRelativeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];

  // Already a valid date format (YYYY-MM-DD or ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split("T")[0];

  const now = new Date();
  const match = dateStr.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case "second": case "minute": case "hour":
        // For sub-day units, just use today
        break;
      case "day":
        now.setDate(now.getDate() - amount);
        break;
      case "week":
        now.setDate(now.getDate() - amount * 7);
        break;
      case "month":
        now.setMonth(now.getMonth() - amount);
        break;
      case "year":
        now.setFullYear(now.getFullYear() - amount);
        break;
    }
    return now.toISOString().split("T")[0];
  }

  // Try native Date parsing as fallback
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];

  return new Date().toISOString().split("T")[0];
}

// Use service role client for ingestion (bypasses RLS)
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function runIngestion(campaignId: string): Promise<{ newArticles: number }> {
  const supabase = getServiceClient();

  // Fetch campaign data
  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campError || !campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Fetch active opponents
  const { data: opponents } = await supabase
    .from("opponents")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "active");

  const opponentList = (opponents || []) as Opponent[];
  const opponentNames = opponentList.map((o) => o.name);

  // Build search queries
  const searchConfig = campaign.search_config as Campaign["search_config"];
  const queries: { terms: string; bin: BinType }[] = [];

  // Candidate terms
  for (const term of searchConfig.candidate_terms || []) {
    queries.push({ terms: term, bin: "candidate" });
  }

  // Opponent terms
  for (const opponent of opponentList) {
    for (const term of opponent.search_terms || []) {
      queries.push({ terms: term, bin: "opponent" });
    }
  }

  // General race terms
  for (const term of searchConfig.general_race_terms || []) {
    queries.push({ terms: term, bin: "general_race" });
  }

  // Fetch existing URLs for deduplication
  const { data: existingArticles } = await supabase
    .from("articles")
    .select("url")
    .eq("campaign_id", campaignId);

  const existingUrls = new Set((existingArticles || []).map((a: { url: string }) => a.url));

  // Search and collect unique new articles
  const newArticleUrls = new Map<string, { title: string; link: string; source: string; date: string; snippet: string }>();

  for (const query of queries) {
    try {
      const results = await searchNews(query.terms, 10);
      for (const result of results) {
        if (!existingUrls.has(result.link) && !newArticleUrls.has(result.link)) {
          newArticleUrls.set(result.link, {
            title: result.title,
            link: result.link,
            source: result.source,
            date: result.date,
            snippet: result.snippet,
          });
        }
      }
    } catch (error) {
      console.error(`Search failed for query "${query.terms}":`, error);
    }
  }

  // Process each new article
  let newArticleCount = 0;
  const binsWithNewArticles = new Set<BinType>();

  for (const [, articleData] of newArticleUrls) {
    try {
      // Scrape full text
      const scraped = await scrapeArticle(articleData.link);

      // AI analysis
      const analysis = await analyzeArticle(
        articleData.title,
        articleData.source,
        scraped.fullText,
        campaign as Campaign,
        opponentNames
      );

      // Insert article
      const { data: insertedArticle, error: insertError } = await supabase
        .from("articles")
        .insert({
          campaign_id: campaignId,
          bin: analysis.bin,
          headline: articleData.title,
          url: articleData.link,
          reporter: null,
          outlet: articleData.source,
          date_published: parseRelativeDate(articleData.date),
          sentiment: analysis.sentiment,
          reach: analysis.reach,
          key_themes: analysis.key_themes,
          full_text: scraped.fullText,
          ai_summary: analysis.ai_summary,
          paywall_status: scraped.paywallStatus,
          va_politics_relevant: analysis.va_politics_relevant,
          va_politics_topics: analysis.va_politics_topics,
          alert_tier: analysis.alert_tier,
          alert_reason: analysis.alert_reason,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to insert article: ${articleData.title}`, insertError);
        continue;
      }

      binsWithNewArticles.add(analysis.bin);
      newArticleCount++;

      // Insert detected entities
      for (const entity of analysis.detected_entities || []) {
        await supabase.from("detected_entities").insert({
          campaign_id: campaignId,
          article_id: insertedArticle.id,
          name: entity.name,
          role: entity.role,
          context: entity.context,
          confidence: entity.confidence,
        });

        // Also insert into article_entities junction
        await supabase.from("article_entities").insert({
          article_id: insertedArticle.id,
          entity_name: entity.name,
          entity_role: entity.entity_role || "mentioned",
          entity_type: entity.entity_type || "other",
          sentiment_toward: entity.sentiment_toward || "neutral",
        });
      }

      // Create alert if needed
      if (analysis.alert_tier && analysis.alert_tier !== "none") {
        const { data: alert } = await supabase
          .from("alerts")
          .insert({
            campaign_id: campaignId,
            article_id: insertedArticle.id,
            tier: analysis.alert_tier,
            title: articleData.title,
            description: analysis.alert_reason || `${analysis.sentiment} coverage in ${articleData.source}`,
          })
          .select("*")
          .single();

        // Send immediate email for critical alerts
        if (analysis.alert_tier === "critical" && campaign.alert_email) {
          try {
            await resend.emails.send({
              from: "CampaignAssist <alerts@campaignassist.app>",
              to: campaign.alert_email,
              subject: `🚨 Critical Alert: ${articleData.title}`,
              html: `
                <h2>Critical Campaign Alert</h2>
                <p><strong>${articleData.title}</strong></p>
                <p><em>${articleData.source}</em> · Sentiment: ${analysis.sentiment}</p>
                <p>${analysis.alert_reason || analysis.ai_summary}</p>
                <p><a href="${articleData.link}">Read Article</a></p>
                <hr>
                <p><small>CampaignAssist — Campaign Intelligence Platform</small></p>
              `,
            });
          } catch (emailError) {
            console.error("Failed to send critical alert email:", emailError);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to process article: ${articleData.title}`, error);
    }
  }

  // Regenerate bin summaries for affected bins
  for (const bin of binsWithNewArticles) {
    try {
      await regenerateBinSummary(campaignId, bin, campaign as Campaign);
    } catch (error) {
      console.error(`Failed to regenerate summary for bin ${bin}:`, error);
    }
  }

  return { newArticles: newArticleCount };
}

async function regenerateBinSummary(campaignId: string, bin: BinType, campaign: Campaign) {
  const supabase = getServiceClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: articles } = await supabase
    .from("articles")
    .select("headline, outlet, sentiment, ai_summary, date_published")
    .eq("campaign_id", campaignId)
    .eq("bin", bin)
    .gte("ingested_at", sevenDaysAgo.toISOString())
    .order("date_published", { ascending: false });

  if (!articles || articles.length < 1) return;

  const result = await generateBinSummary(
    articles as { headline: string; outlet: string; sentiment: string; ai_summary: string; date_published: string }[],
    bin,
    campaign.candidate_name
  );

  const today = new Date().toISOString().split("T")[0];

  await supabase.from("bin_summaries").insert({
    campaign_id: campaignId,
    bin,
    summary_text: result.summary,
    narrative_trend: result.trend,
    article_count: articles.length,
    period_start: sevenDaysAgo.toISOString().split("T")[0],
    period_end: today,
  });
}
