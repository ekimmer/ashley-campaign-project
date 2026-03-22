import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateVaPoliticsBriefing } from "@/lib/ai-analysis";
import type { Campaign } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const campaignId = body.campaignId;

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId required" }, { status: 400 });
    }

    // Verify access
    const { data: userCampaign } = await supabase
      .from("user_campaigns")
      .select("campaign_id")
      .eq("user_id", user.id)
      .eq("campaign_id", campaignId)
      .single();

    if (!userCampaign) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Use service client for writes
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get campaign
    const { data: campaign } = await serviceClient
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get VA-politics-relevant articles from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: articles } = await serviceClient
      .from("articles")
      .select("headline, outlet, ai_summary, va_politics_topics, date_published")
      .eq("campaign_id", campaignId)
      .eq("va_politics_relevant", true)
      .gte("ingested_at", sevenDaysAgo.toISOString())
      .order("date_published", { ascending: false });

    if (!articles || articles.length === 0) {
      return NextResponse.json({ error: "No VA-politics-relevant articles found" }, { status: 404 });
    }

    const result = await generateVaPoliticsBriefing(
      articles as { headline: string; outlet: string; ai_summary: string; va_politics_topics: string[]; date_published: string }[],
      (campaign as Campaign).candidate_name,
      (campaign as Campaign).district
    );

    const today = new Date().toISOString().split("T")[0];

    await serviceClient.from("va_politics_briefings").insert({
      campaign_id: campaignId,
      briefing_text: result.briefing,
      hot_issues: result.hot_issues,
      so_what: result.so_what,
      period_start: sevenDaysAgo.toISOString().split("T")[0],
      period_end: today,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Briefing generation error:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
