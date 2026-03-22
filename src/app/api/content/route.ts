import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateContentIdeas, generateHitResponse } from "@/lib/ai-analysis";
import type { Campaign } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, campaignId, hitId } = body;

    if (!action || !campaignId) {
      return NextResponse.json(
        { error: "action and campaignId required" },
        { status: 400 }
      );
    }

    // Verify user has access to this campaign
    const { data: userCampaign } = await supabase
      .from("user_campaigns")
      .select("campaign_id")
      .eq("user_id", user.id)
      .eq("campaign_id", campaignId)
      .single();

    if (!userCampaign) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Use service client for writes (bypasses RLS)
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get campaign details
    const { data: campaign } = await serviceClient
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const typedCampaign = campaign as Campaign;

    if (action === "generate-ideas") {
      // Get recent articles (last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: articles } = await serviceClient
        .from("articles")
        .select(
          "id, headline, outlet, ai_summary, sentiment, key_themes, date_published"
        )
        .eq("campaign_id", campaignId)
        .gte("ingested_at", threeDaysAgo.toISOString())
        .order("date_published", { ascending: false });

      if (!articles || articles.length === 0) {
        return NextResponse.json(
          { error: "No recent articles found to generate ideas from" },
          { status: 404 }
        );
      }

      const result = await generateContentIdeas(
        articles as {
          headline: string;
          outlet: string;
          ai_summary: string;
          sentiment: string;
          key_themes: string[];
          date_published: string;
        }[],
        typedCampaign.candidate_name
      );

      // Find source article IDs by matching headlines
      const articleMap = new Map(
        (articles as { id: string; headline: string }[]).map((a) => [
          a.headline,
          a.id,
        ])
      );

      // Store each idea in the database
      for (const idea of result.ideas) {
        const sourceId = articleMap.get(idea.source_headline);
        await serviceClient.from("content_ideas").insert({
          campaign_id: campaignId,
          category: idea.category,
          title: idea.title,
          content: idea.content,
          format: idea.format,
          source_article_ids: sourceId ? [sourceId] : [],
        });
      }

      return NextResponse.json({
        success: true,
        count: result.ideas.length,
      });
    }

    if (action === "generate-hit-response") {
      if (!hitId) {
        return NextResponse.json(
          { error: "hitId required for generate-hit-response" },
          { status: 400 }
        );
      }

      // Fetch the candidate hit
      const { data: hit } = await serviceClient
        .from("candidate_hits")
        .select("*")
        .eq("id", hitId)
        .eq("campaign_id", campaignId)
        .single();

      if (!hit) {
        return NextResponse.json(
          { error: "Hit not found" },
          { status: 404 }
        );
      }

      const result = await generateHitResponse(
        {
          source_name: hit.source_name,
          comment_summary: hit.comment_summary,
          context: hit.context,
        },
        typedCampaign.candidate_name
      );

      // Store the response
      await serviceClient.from("hit_responses").insert({
        campaign_id: campaignId,
        hit_id: hitId,
        response_text: result.response_text,
        tone: result.tone,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Content API error:", error);
    return NextResponse.json(
      { error: "Content generation failed" },
      { status: 500 }
    );
  }
}
