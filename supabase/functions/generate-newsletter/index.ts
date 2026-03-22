// Supabase Edge Function: generate-newsletter
// Generates AI-powered newsletter outlines from recent articles
// Can be triggered via cron or manually

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Get all campaigns
    const { data: campaigns } = await supabase.from("campaigns").select("*");

    for (const campaign of campaigns || []) {
      try {
        // Get articles from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: articles } = await supabase
          .from("articles")
          .select(
            "id, headline, outlet, ai_summary, bin, sentiment, date_published"
          )
          .eq("campaign_id", campaign.id)
          .gte("ingested_at", yesterday.toISOString())
          .order("date_published", { ascending: false });

        if (!articles || articles.length === 0) {
          console.log(
            `No recent articles for campaign ${campaign.id}, skipping newsletter`
          );
          continue;
        }

        // Build article list for the prompt
        const articleList = articles
          .map(
            (a: {
              bin: string;
              sentiment: string;
              headline: string;
              outlet: string;
              date_published: string;
              ai_summary: string;
            }) =>
              `- [${a.bin}/${a.sentiment}] ${a.headline} (${a.outlet}, ${a.date_published}): ${a.ai_summary}`
          )
          .join("\n");

        const promptText = `You are a campaign communications director for the ${campaign.candidate_name} campaign (${campaign.district}). Draft a daily newsletter outline for campaign supporters.

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

Return ONLY valid JSON.`;

        // Call Anthropic API directly (Edge Functions use Deno, not the Node SDK)
        const response = await fetch(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicApiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2000,
              messages: [{ role: "user", content: promptText }],
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
        }

        const aiResult = await response.json();
        const text =
          aiResult.content[0].type === "text" ? aiResult.content[0].text : "";

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in AI response");
        }

        const parsed = JSON.parse(jsonMatch[0]) as { outline_html: string };

        const today = new Date();
        const periodStart = new Date(yesterday).toISOString().split("T")[0];
        const periodEnd = today.toISOString().split("T")[0];

        // Store the newsletter outline
        await supabase.from("newsletter_outlines").insert({
          campaign_id: campaign.id,
          outline_html: parsed.outline_html,
          source_article_ids: articles.map(
            (a: { id: string }) => a.id
          ),
          period_start: periodStart,
          period_end: periodEnd,
        });

        console.log(
          `Newsletter generated for campaign ${campaign.id} with ${articles.length} articles`
        );
      } catch (err) {
        console.error(
          `Newsletter generation failed for campaign ${campaign.id}:`,
          err
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
