"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/use-campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Lightbulb, Newspaper, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ContentIdea,
  NewsletterOutline,
  CandidateHit,
  HitResponse,
} from "@/types/database";

export default function ContentMapPage() {
  const { campaign } = useCampaign();
  const supabase = createClient();

  // Social & Video Ideas state
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasRefreshing, setIdeasRefreshing] = useState(false);

  // Newsletter state
  const [newsletters, setNewsletters] = useState<NewsletterOutline[]>([]);
  const [selectedNewsletter, setSelectedNewsletter] =
    useState<NewsletterOutline | null>(null);
  const [newsletterLoading, setNewsletterLoading] = useState(true);

  // Hit Responses state
  const [hits, setHits] = useState<
    (CandidateHit & { hit_response?: HitResponse | null })[]
  >([]);
  const [hitsLoading, setHitsLoading] = useState(true);
  const [generatingHitId, setGeneratingHitId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ideas" | "newsletter" | "hits">("ideas");

  // Fetch content ideas (last 3 days)
  const fetchIdeas = useCallback(async () => {
    if (!campaign) return;
    setIdeasLoading(true);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data } = await supabase
      .from("content_ideas")
      .select("*")
      .eq("campaign_id", campaign.id)
      .gte("generated_at", threeDaysAgo.toISOString())
      .order("generated_at", { ascending: false });

    setIdeas((data || []) as ContentIdea[]);
    setIdeasLoading(false);
  }, [campaign, supabase]);

  // Fetch newsletters
  const fetchNewsletters = useCallback(async () => {
    if (!campaign) return;
    setNewsletterLoading(true);

    const { data } = await supabase
      .from("newsletter_outlines")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("generated_at", { ascending: false })
      .limit(20);

    const outlines = (data || []) as NewsletterOutline[];
    setNewsletters(outlines);
    if (outlines.length > 0) {
      setSelectedNewsletter(outlines[0]);
    }
    setNewsletterLoading(false);
  }, [campaign, supabase]);

  // Fetch candidate hits with responses
  const fetchHits = useCallback(async () => {
    if (!campaign) return;
    setHitsLoading(true);

    const { data: hitsData } = await supabase
      .from("candidate_hits")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false });

    const hitsWithResponses: (CandidateHit & {
      hit_response?: HitResponse | null;
    })[] = [];

    for (const hit of (hitsData || []) as CandidateHit[]) {
      const { data: responseData } = await supabase
        .from("hit_responses")
        .select("*")
        .eq("hit_id", hit.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .single();

      hitsWithResponses.push({
        ...hit,
        hit_response: (responseData as HitResponse) || null,
      });
    }

    setHits(hitsWithResponses);
    setHitsLoading(false);
  }, [campaign, supabase]);

  useEffect(() => {
    if (!campaign) return;
    fetchIdeas();
    fetchNewsletters();
    fetchHits();
  }, [campaign, fetchIdeas, fetchNewsletters, fetchHits]);

  // Refresh content ideas via API
  async function handleRefreshIdeas() {
    if (!campaign) return;
    setIdeasRefreshing(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-ideas",
          campaignId: campaign.id,
        }),
      });
      if (res.ok) {
        await fetchIdeas();
      }
    } catch (err) {
      console.error("Failed to refresh ideas:", err);
    } finally {
      setIdeasRefreshing(false);
    }
  }

  // Generate hit response via API
  async function handleGenerateHitResponse(hitId: string) {
    if (!campaign) return;
    setGeneratingHitId(hitId);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-hit-response",
          campaignId: campaign.id,
          hitId,
        }),
      });
      if (res.ok) {
        await fetchHits();
      }
    } catch (err) {
      console.error("Failed to generate hit response:", err);
    } finally {
      setGeneratingHitId(null);
    }
  }

  const formatBadgeVariant = (format: string) => {
    if (format.toLowerCase().includes("instagram")) return "default";
    if (format.toLowerCase().includes("twitter") || format.toLowerCase().includes("x "))
      return "secondary";
    if (format.toLowerCase().includes("tiktok")) return "outline";
    if (format.toLowerCase().includes("facebook")) return "default";
    return "secondary";
  };

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const tabs = [
    { id: "ideas" as const, label: "Social & Video Ideas", icon: Lightbulb, count: ideas.length },
    { id: "newsletter" as const, label: "Newsletter", icon: Newspaper, count: newsletters.length },
    { id: "hits" as const, label: "Hit Responses", icon: MessageSquare, count: hits.length },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ContentMap</h1>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab(tab.id); }}
              className={cn(
                "rounded-xl border-2 p-5 cursor-pointer transition-all",
                isSelected
                  ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className={cn("font-semibold text-sm", isSelected ? "text-primary" : "text-foreground")}>
                    {tab.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tab.count} {tab.count === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "ideas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              AI-generated content ideas based on recent news coverage.
            </p>
            <Button
              onClick={handleRefreshIdeas}
              disabled={ideasRefreshing}
              size="sm"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${ideasRefreshing ? "animate-spin" : ""}`}
              />
              {ideasRefreshing ? "Generating..." : "Refresh Ideas"}
            </Button>
          </div>

          {ideasLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : ideas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center">
                  No content ideas yet. Click &quot;Refresh Ideas&quot; to
                  generate ideas from recent news articles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ideas.map((idea) => (
                <Card key={idea.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">
                        {idea.title}
                      </CardTitle>
                      <Badge variant={formatBadgeVariant(idea.format)}>
                        {idea.format}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {idea.content}
                    </p>
                    <p className="text-xs text-muted-foreground/70 italic">
                      Category: {idea.category}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Newsletter */}
      {activeTab === "newsletter" && (
        <div className="space-y-4">
          {newsletterLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : newsletters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Newspaper className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center">
                  No newsletter outlines yet. Outlines are generated
                  automatically or can be triggered via the newsletter Edge
                  Function.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Date selector sidebar */}
              <div className="md:w-56 shrink-0 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Past Outlines
                </h3>
                <div className="space-y-1">
                  {newsletters.map((nl) => (
                    <button
                      key={nl.id}
                      onClick={() => setSelectedNewsletter(nl)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedNewsletter?.id === nl.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      {new Date(nl.generated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </button>
                  ))}
                </div>
              </div>

              {/* Newsletter content - uses dangerouslySetInnerHTML for trusted AI-generated HTML stored in our own database */}
              {selectedNewsletter && (
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Newsletter Outline</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        Generated{" "}
                        {new Date(
                          selectedNewsletter.generated_at
                        ).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: selectedNewsletter.outline_html,
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Hit Responses */}
      {activeTab === "hits" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Negative comments and attacks detected in news coverage, with
            AI-generated response strategies.
          </p>

          {hitsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : hits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center">
                  No candidate hits detected yet. Hits are automatically
                  extracted when news articles are ingested.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {hits.map((hit) => (
                <Card key={hit.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {hit.source_name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(hit.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      {!hit.hit_response && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateHitResponse(hit.id)}
                          disabled={generatingHitId === hit.id}
                        >
                          {generatingHitId === hit.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            "Generate Response"
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Attack Summary
                      </p>
                      <p className="text-sm">{hit.comment_summary}</p>
                    </div>

                    {hit.context && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Original Context
                        </p>
                        <p className="text-sm italic text-muted-foreground">
                          &quot;{hit.context}&quot;
                        </p>
                      </div>
                    )}

                    {hit.hit_response && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">
                            AI Response Strategy
                          </p>
                          <div className="flex items-center gap-2">
                            {hit.hit_response.tone && (
                              <Badge variant="outline">
                                {hit.hit_response.tone}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleGenerateHitResponse(hit.id)
                              }
                              disabled={generatingHitId === hit.id}
                            >
                              {generatingHitId === hit.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                "Regenerate"
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">
                          {hit.hit_response.response_text}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
