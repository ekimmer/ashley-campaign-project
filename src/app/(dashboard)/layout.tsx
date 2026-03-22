"use client";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { AlertBanner } from "@/components/alert-banner";
import { useCampaign } from "@/hooks/use-campaign";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Alert } from "@/types/database";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { campaign, loading } = useCampaign();
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [criticalAlert, setCriticalAlert] = useState<Alert | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!campaign) return;

    async function fetchAlerts() {
      const { data, count } = await supabase
        .from("alerts")
        .select("*", { count: "exact" })
        .eq("campaign_id", campaign!.id)
        .eq("acknowledged", false)
        .order("created_at", { ascending: false });

      setUnacknowledgedCount(count ?? 0);

      const critical = data?.find((a: Alert) => a.tier === "critical");
      setCriticalAlert(critical ?? null);
    }

    fetchAlerts();
  }, [campaign]);

  async function handleScanNow() {
    if (!campaign) return;
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Scan complete: ${data.newArticles ?? 0} new articles found`);
      } else {
        toast.error(data.error || "Scan failed");
      }
    } catch {
      toast.error("Failed to trigger scan");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar unacknowledgedAlertCount={unacknowledgedCount} />
      <div className="lg:ml-64">
        <Header
          campaignName={campaign?.name}
          onScanNow={handleScanNow}
        />
        <AlertBanner alert={criticalAlert} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
