// Supabase Edge Function: generate-digest
// Schedule: Daily at configured digest time
// This function generates and sends the daily digest email for all campaigns

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    // Get all campaigns
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("*");

    for (const campaign of campaigns || []) {
      try {
        // Get articles from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: articles } = await supabase
          .from("articles")
          .select("*")
          .eq("campaign_id", campaign.id)
          .gte("ingested_at", yesterday.toISOString())
          .order("date_published", { ascending: false });

        // Get alerts from last 24 hours
        const { data: alerts } = await supabase
          .from("alerts")
          .select("*")
          .eq("campaign_id", campaign.id)
          .gte("created_at", yesterday.toISOString())
          .order("created_at", { ascending: false });

        // Get latest VA politics briefing
        const { data: briefing } = await supabase
          .from("va_politics_briefings")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .single();

        // Count articles per bin
        const candidateCount = (articles || []).filter((a: { bin: string }) => a.bin === "candidate").length;
        const opponentCount = (articles || []).filter((a: { bin: string }) => a.bin === "opponent").length;
        const raceCount = (articles || []).filter((a: { bin: string }) => a.bin === "general_race").length;
        const totalArticles = (articles || []).length;

        // Build digest HTML
        const digestHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #e8458b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">CampaignAssist Daily Digest</h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">${campaign.candidate_name} — ${new Date().toLocaleDateString()}</p>
            </div>

            <div style="padding: 20px; background: #f9f9f9;">
              <h2 style="color: #333; border-bottom: 2px solid #e8458b; padding-bottom: 8px;">Overnight Summary</h2>
              <p>${totalArticles > 0
                ? `${totalArticles} new article${totalArticles !== 1 ? "s" : ""} detected in the last 24 hours: ${candidateCount} about ${campaign.candidate_name}, ${opponentCount} about opponents, and ${raceCount} about the race generally.`
                : "No new coverage detected in the last 24 hours."
              }</p>

              ${(alerts || []).length > 0 ? `
                <h2 style="color: #333; border-bottom: 2px solid #e8458b; padding-bottom: 8px;">Alerts</h2>
                <ul>
                  ${(alerts || []).map((a: { tier: string; title: string }) => `<li><strong>[${a.tier.toUpperCase()}]</strong> ${a.title}</li>`).join("")}
                </ul>
              ` : ""}

              ${briefing ? `
                <h2 style="color: #333; border-bottom: 2px solid #e8458b; padding-bottom: 8px;">VA Politics Highlights</h2>
                <p>${(briefing as { so_what: string }).so_what}</p>
              ` : ""}

              <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #eee;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  View full details in your <a href="${Deno.env.get("APP_URL") || "https://campaignassist.app"}" style="color: #e8458b;">CampaignAssist dashboard</a>
                </p>
              </div>
            </div>
          </div>
        `;

        // Send email
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "CampaignAssist <digest@campaignassist.app>",
            to: campaign.alert_email,
            subject: `📋 Daily Digest — ${campaign.candidate_name} — ${new Date().toLocaleDateString()}`,
            html: digestHtml,
          }),
        });

        // Store digest record
        await supabase.from("digests").insert({
          campaign_id: campaign.id,
          content_html: digestHtml,
        });

      } catch (err) {
        console.error(`Digest failed for campaign ${campaign.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
