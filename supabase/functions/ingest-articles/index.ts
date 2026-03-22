// Supabase Edge Function: ingest-articles
// Schedule: Every 30 minutes via Supabase cron
// This function triggers the article ingestion pipeline for all active campaigns

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

    // Get all active campaigns
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("id");

    if (error) throw error;

    // Trigger ingestion for each campaign via the Next.js API
    const appUrl = Deno.env.get("APP_URL") || "https://campaignassist.app";

    for (const campaign of campaigns || []) {
      try {
        await fetch(`${appUrl}/api/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: campaign.id }),
        });
      } catch (err) {
        console.error(`Ingestion failed for campaign ${campaign.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, campaigns: campaigns?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
