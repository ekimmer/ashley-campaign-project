"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Campaign } from "@/types/database";
import type { User } from "@supabase/supabase-js";

export function useCampaign() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      // Get the user's first campaign
      const { data: userCampaign } = await supabase
        .from("user_campaigns")
        .select("campaign_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (userCampaign) {
        const { data: campaignData } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", userCampaign.campaign_id)
          .single();

        setCampaign(campaignData as Campaign | null);
      }

      setLoading(false);
    }

    load();
  }, []);

  return { campaign, user, loading };
}
