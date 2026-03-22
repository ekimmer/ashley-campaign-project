"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import type { VaPoliticsBriefing, HotIssue } from "@/types/database";
import { toast } from "sonner";

export default function VaPoliticsPage() {
  const { campaign } = useCampaign();
  const [briefing, setBriefing] = useState<VaPoliticsBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!campaign) return;
    fetchBriefing();
  }, [campaign]);

  async function fetchBriefing() {
    const { data } = await supabase
      .from("va_politics_briefings")
      .select("*")
      .eq("campaign_id", campaign!.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    setBriefing(data as VaPoliticsBriefing | null);
    setLoading(false);
  }

  async function handleRefresh() {
    if (!campaign) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      if (res.ok) {
        toast.success("Briefing refreshed");
        await fetchBriefing();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to refresh briefing");
      }
    } catch {
      toast.error("Failed to refresh briefing");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">VA Politics</h1>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Generate Briefing
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No briefing available yet</p>
            <p className="text-sm mt-1">
              A briefing will be generated once enough VA-politics-relevant articles are ingested.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hotIssues = (briefing.hot_issues || []) as HotIssue[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VA Politics</h1>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Briefing"}
        </Button>
      </div>

      {/* Political Landscape Briefing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Political Landscape Briefing</CardTitle>
            <span className="text-xs text-muted-foreground">
              Generated: {new Date(briefing.generated_at).toLocaleString()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="leading-relaxed whitespace-pre-wrap">{briefing.briefing_text}</p>
          </div>
        </CardContent>
      </Card>

      {/* Hot Issues */}
      {hotIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hot-Button Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hotIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
                  <span className="text-lg font-bold text-primary mt-0.5">
                    #{i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{issue.name}</p>
                      <Badge variant="outline">{issue.partisan_lean}</Badge>
                      <Badge
                        variant={
                          issue.district_relevance === "High"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {issue.district_relevance} relevance
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {issue.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* So What */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>So What — Strategic Implications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {briefing.so_what}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
