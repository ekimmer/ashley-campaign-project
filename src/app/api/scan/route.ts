import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runIngestion } from "@/lib/ingestion";

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

    const result = await runIngestion(campaignId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Scan failed" },
      { status: 500 }
    );
  }
}
